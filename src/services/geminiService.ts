import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { db } from "../lib/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  serverTimestamp, 
  query, 
  where, 
  limit 
} from "firebase/firestore";

// Initialize Gemini with telemetry headers as recommended by the Gemini API Skill
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Tool declaration: logComplaint (available to all users)
export const logComplaintFunction: FunctionDeclaration = {
  name: "logComplaint",
  parameters: {
    type: Type.OBJECT,
    description: "Log a formal complaint, bug, or technical issue reported by the user.",
    properties: {
      message: {
        type: Type.STRING,
        description: "The core issue or complaint described by the user.",
      },
      category: {
        type: Type.STRING,
        description: "The category of the complaint (e.g., technical, payment, behavior, team).",
      }
    },
    required: ["message", "category"],
  },
};

// Tool declaration: getSystemBugs (available only to Admins/Mods)
export const getSystemBugsFunction: FunctionDeclaration = {
  name: "getSystemBugs",
  description: "Fetch the most recent system errors, bugs, and technical issues recorded in the system logs or user complaints.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

// Tool declaration: getMostReportedPlayers (available only to Admins/Mods)
export const getMostReportedPlayersFunction: FunctionDeclaration = {
  name: "getMostReportedPlayers",
  description: "Retrieve a summary list of the most reported players, aggregating report reasons, count, and user profile metadata.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

// Tool resolver: getSystemBugs
async function resolveSystemBugs() {
  try {
    // Fetch last 50 logs from system_logs (client-side sort to avoid index requirements)
    const logsSnap = await getDocs(collection(db, "system_logs"));
    const logs = logsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        feature: data.feature || "Unknown",
        message: data.message || "",
        suggestion: data.suggestion || "",
        timestamp: data.timestamp?.toDate()?.toISOString() || "Unknown",
        timestampObj: data.timestamp?.toDate() || new Date(0),
        severity: data.severity || "warning",
        type: data.type || "error"
      };
    })
    .filter(log => log.type === "error" || log.severity === "high")
    .sort((a, b) => b.timestampObj.getTime() - a.timestampObj.getTime())
    .slice(0, 15);

    // Fetch complaints of technical/bug category
    const complaintsSnap = await getDocs(query(collection(db, "complaints"), where("category", "in", ["technical", "bug", "payment"]), limit(15)));
    const complaints = complaintsSnap.docs.map(doc => ({
      id: doc.id,
      userId: doc.data().userId || "Unknown",
      message: doc.data().message || "",
      category: doc.data().category || "technical",
      timestamp: doc.data().timestamp?.toDate()?.toISOString() || "Unknown",
      status: doc.data().status || "new"
    }));

    return { logs, complaints };
  } catch (error: any) {
    console.error("Error resolving system bugs:", error);
    return { error: error.message || String(error) };
  }
}

// Tool resolver: getMostReportedPlayers
async function resolveMostReportedPlayers() {
  try {
    const reportsSnap = await getDocs(collection(db, "reports"));
    const reports = reportsSnap.docs.map(doc => ({
      id: doc.id,
      reportedId: doc.data().reportedId,
      reasons: doc.data().reasons || [],
      timestamp: doc.data().timestamp?.toDate()?.toISOString() || "Unknown",
      reporterId: doc.data().reporterId
    }));

    // Aggregate by reportedId
    const counts: Record<string, { count: number; reasons: string[]; lastReported: string }> = {};
    reports.forEach(r => {
      if (!r.reportedId) return;
      if (!counts[r.reportedId]) {
        counts[r.reportedId] = { count: 0, reasons: [], lastReported: r.timestamp };
      }
      counts[r.reportedId].count += 1;
      counts[r.reportedId].reasons.push(...r.reasons);
      if (new Date(r.timestamp) > new Date(counts[r.reportedId].lastReported)) {
        counts[r.reportedId].lastReported = r.timestamp;
      }
    });

    // Sort by count desc
    const sorted = Object.entries(counts)
      .map(([reportedId, info]) => ({
        userId: reportedId,
        reportCount: info.count,
        reasons: Array.from(new Set(info.reasons)),
        lastReported: info.lastReported
      }))
      .sort((a, b) => b.reportCount - a.reportCount)
      .slice(0, 10);

    // Fetch user details for top reported players
    const results = await Promise.all(sorted.map(async (item) => {
      try {
        const uDoc = await getDoc(doc(db, "users", item.userId));
        if (uDoc.exists()) {
          const uData = uDoc.data();
          return {
            ...item,
            name: uData.name || "Anonymous",
            email: uData.email || "No email",
            ingameName: uData.ingameName || "No IG Name",
            isBanned: uData.isBanned || false,
            isRestricted: uData.isRestricted || false
          };
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
      }
      return { ...item, name: "Unknown User", email: "N/A" };
    }));

    return { topReported: results };
  } catch (error: any) {
    console.error("Error resolving most reported players:", error);
    return { error: error.message || String(error) };
  }
}

export async function handleAIResponse(
  userId: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  userMessage: string
) {
  try {
    // 1. Check if the user has Admin/Mod authorization
    const userDoc = await getDoc(doc(db, "users", userId));
    let isAdminOrMod = false;
    let userName = "User";
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const email = userData.email || "";
      userName = userData.name || "User";
      isAdminOrMod = userData.isAdmin === true || 
                     userData.role === "moderator" || 
                     userData.isMod === true || 
                     email.toLowerCase() === "blameboyop@gmail.com";
    }

    // 2. Setup System Instruction based on user role
    const systemInstruction = isAdminOrMod 
      ? `You are "Support AI", the official assistant for Squad UP Arena.
         You are currently chatting with an authorized Admin or Moderator named ${userName} (ID: ${userId}).
         
         Since they are an Admin/Mod, you have advanced tools to inspect internal platform data:
         1. 'getSystemBugs': Retrieves recent system bug/error logs and user-logged technical/payment complaints.
         2. 'getMostReportedPlayers': Retrieves behavioral reports logged against users, sorted by the most-reported.
         
         Your instructions for Admins/Mods:
         - Proactively offer to help them manage the platform.
         - When they ask about bugs, errors, stability, or issues, use 'getSystemBugs' to retrieve and analyze the logs. Identify the features causing issues (e.g., Logo System, Match joining) and highlight their severity and suggestions.
         - When they ask about reported players, toxic users, or ban list recommendations, use 'getMostReportedPlayers' to fetch the top reported users. Group them, detail their offenses, list their names/emails/IDs, and present the information elegantly in markdown.
         - Maintain a highly secure, professional, and helpful operator tone.`
      : `You are "Support AI", the official assistant for Squad UP Arena.
         Squad UP Arena is a competitive esports platform for games like Free Fire and BGMI.
         
         Your goals:
         1. Answer questions about app features (Tournaments, Teams, Profile, Shop, Tasks).
         2. Guide users on how to complete tasks to earn rewards (coins, diamonds).
         3. Help with navigation (e.g., "Go to the Team tab to join a squad").
         4. Handle complaints politely.
         
         Complaints:
         If a user reports a specific problem (bug, harassment, payment failure), use the 'logComplaint' tool to record it.
         After logging, reassure the user that our team will look into it.
         
         Tone: Friendly, professional, and concise. Keep answers short and mobile-friendly.`;

    // 3. Define Tools
    const tools: any[] = [{ functionDeclarations: [logComplaintFunction] }];
    if (isAdminOrMod) {
      tools[0].functionDeclarations.push(getSystemBugsFunction);
      tools[0].functionDeclarations.push(getMostReportedPlayersFunction);
    }

    // 4. Initialize dialog contents
    const contents: any[] = [
      ...history.map(h => ({
        role: h.role,
        parts: h.parts.map(p => {
          if ('text' in p) return { text: p.text };
          return p;
        })
      })),
      { role: "user", parts: [{ text: userMessage }] }
    ];

    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash", // Use standard supported model from Gemini API Skill
        contents,
        config: {
          systemInstruction,
          tools,
        },
      });

      const call = response.functionCalls?.[0];
      if (!call) {
        return response.text || "I'm sorry, I'm having trouble processing that right now.";
      }

      // Execute function call
      let functionResult: any = null;
      if (call.name === "logComplaint") {
        const args = call.args as { message: string; category: string };
        await addDoc(collection(db, "complaints"), {
          userId,
          message: args.message,
          category: args.category,
          timestamp: serverTimestamp(),
          status: "new"
        });
        functionResult = { status: "logged_successfully", complaint: args };
      } else if (call.name === "getSystemBugs") {
        functionResult = await resolveSystemBugs();
      } else if (call.name === "getMostReportedPlayers") {
        functionResult = await resolveMostReportedPlayers();
      } else {
        functionResult = { error: "Unknown function called" };
      }

      // Append model call and tool response to contents to continue dialog with the model
      contents.push({
        role: "model",
        parts: [{ functionCall: call }]
      });

      contents.push({
        role: "user",
        parts: [{
          functionResponse: {
            name: call.name,
            response: functionResult
          }
        }]
      });
    }

    return "I apologize, but I could not formulate a response within my processing limits. Please try again.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm experiencing some lag in my cognitive circuits. Please try again in a moment!";
  }
}
