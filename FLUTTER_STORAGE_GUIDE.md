# Firebase Storage Integration Guide (Flutter)

This guide provides the Flutter implementation for integrating Firebase Storage into "Squad Up Arena" with admin-only uploads.

## 1. Dependencies
Add these to your `pubspec.yaml`:
```yaml
dependencies:
  firebase_core: ^3.10.1
  firebase_storage: ^11.7.1
  cloud_firestore: ^5.6.2
  image_picker: ^1.1.2
```

## 2. Storage Rules
Deploy these rules to your Firebase Console:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true; // Public read
    }
    match /admin/{folder}/{allPaths=**} {
      allow write: if request.auth != null && 
        firestore.exists(/databases/(default)/documents/admins/$(request.auth.uid));
    }
  }
}
```

## 3. Flutter Implementation

### Admin Storage Service
```dart
import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:image_picker/image_picker.dart';

class AdminStorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final ImagePicker _picker = ImagePicker();

  /// Pick an image from gallery and upload to specified admin folder
  Future<void> pickAndUploadAsset(String folderName) async {
    try {
      // 1. Pick Image
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 70, // Optimize for cost/speed
      );

      if (image == null) return;

      File file = File(image.path);
      String fileName = '${DateTime.now().millisecondsSinceEpoch}_${image.name}';
      String storagePath = 'admin/$folderName/$fileName';

      // 2. Upload to Storage
      Reference ref = _storage.ref().child(storagePath);
      UploadTask uploadTask = ref.putFile(file);

      // (Optional) Monitor progress
      uploadTask.snapshotEvents.listen((TaskSnapshot snapshot) {
        print('Progress: ${snapshot.bytesTransferred / snapshot.totalBytes}');
      });

      // 3. Get Download URL
      TaskSnapshot taskSnapshot = await uploadTask;
      String downloadUrl = await taskSnapshot.ref.getDownloadURL();

      // 4. Store in Firestore
      await _firestore.collection('assets').add({
        'url': downloadUrl,
        'path': storagePath,
        'folder': folderName,
        'uploadedAt': FieldValue.serverTimestamp(),
        'type': 'image',
      });

      print('Upload successful: $downloadUrl');
    } on FirebaseException catch (e) {
      // Handle Firebase specific errors
      print('Firebase Error: ${e.message}');
      throw _handleFirebaseError(e);
    } catch (e) {
      // Handle general errors (no internet, etc.)
      print('General Error: $e');
      rethrow;
    }
  }

  String _handleFirebaseError(FirebaseException e) {
    switch (e.code) {
      case 'permission-denied':
        return 'Admin access required for this folder.';
      case 'unauthorized':
        return 'Please log in as an administrator.';
      case 'retry-limit-exceeded':
        return 'Network error. Please check your connection.';
      default:
        return 'Upload failed: ${e.message}';
    }
  }
}
```

### Usage in UI
```dart
ElevatedButton(
  onPressed: () async {
    try {
      await adminStorageService.pickAndUploadAsset('logos');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Logo uploaded successfully!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  },
  child: Text('Upload Tournament Logo'),
)
```

## 4. Optimization Tips
- **Image Compression**: Use `imageQuality` in `image_picker` or a package like `flutter_image_compress` to reduce file size before upload.
- **Caching**: Use `cached_network_image` to display images in the app for fast subsequent loads.
- **Folder Names**: Stick to `logos`, `banners`, or `shop` as specified.
