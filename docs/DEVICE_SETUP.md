how to connect and run 
# 1. Kill the ADB server to start fresh
adb kill-server
adb start-server

# 2. Pair the device (look at your phone's screen for the IP, Port, and 6-digit code)
# Example: adb pair 192.168.1.34:39273
adb pair <IP>:<PORT>

# 3. Connect to the device (this port is DIFFERENT from the pairing port, check your phone's "IP address & Port" section)
# Example: adb connect 192.168.1.34:41234
adb connect <IP>:<PORT>

# 4. Verify it's connected
adb devices

cd /home/dheeraj/Code/actualproject/LifeLens-AI/mobile/LifeLensApp/android

# Clean previous failed builds
./gradlew clean

# Build the APK
./gradlew assembleDebug


cd /home/dheeraj/Code/actualproject/LifeLens-AI/mobile/LifeLensApp

# Install the APK to your wirelessly connected phone
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Start the Metro Bundler
npx react-native start
