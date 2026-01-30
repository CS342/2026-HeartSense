import React, { useState } from "react";
import { View, Text, TextInput, Button, ScrollView } from "react-native";
import { signup, login, getMyProfile } from "../../lib/auth";
import { auth, db } from "../../lib/firebase";
import { addDoc, collection, serverTimestamp, query, where, getDocs, orderBy, limit } from "firebase/firestore";

export default function TestFirebaseScreen() {
  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("password123");
  const [fullName, setFullName] = useState("Test User");
  const [log, setLog] = useState<string[]>([]);

  const pushLog = (msg: string) => setLog((prev) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...prev]);

  const handleSignup = async () => {
    try {
      pushLog("Signing up...");
      const uid = await signup(email, password, fullName);
      pushLog(`✅ Signup success. uid=${uid}`);
    } catch (e: any) {
      pushLog(`❌ Signup error: ${e?.message || String(e)}`);
      console.error(e);
    }
  };

  const handleLogin = async () => {
    try {
      pushLog("Logging in...");
      const uid = await login(email, password);
      pushLog(`✅ Login success. uid=${uid}`);
    } catch (e: any) {
      pushLog(`❌ Login error: ${e?.message || String(e)}`);
      console.error(e);
    }
  };

  const handleReadProfile = async () => {
    try {
      pushLog("Reading profile...");
      const profile = await getMyProfile();
      pushLog(`✅ Profile: ${JSON.stringify(profile)}`);
    } catch (e: any) {
      pushLog(`❌ Read profile error: ${e?.message || String(e)}`);
      console.error(e);
    }
  };

  const handleWriteSymptom = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No current user. Login first.");

      pushLog("Writing symptom...");
      const ref = await addDoc(collection(db, "symptoms"), {
        user_id: user.uid,
        symptom_type: "chest_pain",
        severity: 7,
        description: "Sharp pain after walking upstairs",
        occurred_at: serverTimestamp(),
        created_at: serverTimestamp()
      });

      pushLog(`✅ Symptom created: ${ref.id}`);
    } catch (e: any) {
      pushLog(`❌ Write symptom error: ${e?.message || String(e)}`);
      console.error(e);
    }
  };

  const handleReadSymptoms = async () => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No current user. Login first.");

      pushLog("Querying symptoms...");
      const q = query(
        collection(db, "symptoms"),
        where("user_id", "==", user.uid),
        orderBy("created_at", "desc"),
        limit(5)
      );

      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      pushLog(`✅ Symptoms (latest 5): ${JSON.stringify(items)}`);
    } catch (e: any) {
      pushLog(`❌ Read symptoms error: ${e?.message || String(e)}`);
      console.error(e);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>Firebase Emulator Test</Text>

      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />

      <Text>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />

      <Text>Full name</Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />

      <View style={{ gap: 10 }}>
        <Button title="1) Signup (creates profile + prefs)" onPress={handleSignup} />
        <Button title="2) Login" onPress={handleLogin} />
        <Button title="3) Read My Profile" onPress={handleReadProfile} />
        <Button title="4) Write Symptom" onPress={handleWriteSymptom} />
        <Button title="5) Read My Symptoms" onPress={handleReadSymptoms} />
      </View>

      <Text style={{ fontSize: 18, fontWeight: "600", marginTop: 10 }}>Logs</Text>
      {log.map((l, idx) => (
        <Text key={idx} style={{ fontFamily: "Courier", fontSize: 12 }}>
          {l}
        </Text>
      ))}
    </ScrollView>
  );
}
