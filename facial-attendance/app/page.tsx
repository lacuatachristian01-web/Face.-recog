"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [section, setSection] = useState("");
  const [year, setYear] = useState("");

  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [registeredId, setRegisteredId] = useState<string | null>(null);

  // LOAD MODELS
  useEffect(() => {
    async function loadModels() {
      try {
        const faceapi = await import("face-api.js");

        await faceapi.nets.tinyFaceDetector.loadFromUri("/models/tiny_face_detector");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models/face_recognition");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models/face_landmark_68");

        setModelsLoaded(true);
      } catch (err) {
        console.error(err);
      }
    }
    loadModels();
  }, []);

  // CAMERA
  async function startCamera() {
    if (!videoRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
  }

  async function stopCamera() {
    if (!videoRef.current) return;
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
  }

  // REGISTER STUDENT (NO AUTH)
  async function registerStudent(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          name,
          student_id: studentId,
          section,
          year,
        })
        .select()
        .single();

      if (error) throw error;

      setRegisteredId(data.id);
      alert("Student registered! Now register face.");

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  // REGISTER FACE
  async function registerFace() {
    if (!videoRef.current) return;
    if (!modelsLoaded) return alert("Models not loaded");
    if (!registeredId) return alert("Register student first");

    setLoading(true);

    try {
      const faceapi = await import("face-api.js");
      const options = new faceapi.TinyFaceDetectorOptions();

      const detection = await faceapi
        .detectSingleFace(videoRef.current, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        alert("No face detected");
        return;
      }

      const descriptor = Array.from(detection.descriptor);

      const { error } = await supabase
        .from("face_descriptors")
        .insert({
          profile_id: registeredId,
          descriptor,
        });

      if (error) throw error;

      alert("Face registered successfully!");

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <main className="w-full max-w-xl p-6 bg-white rounded shadow space-y-4">

        <h1 className="text-xl font-bold">Facial Attendance (No Email)</h1>

        {/* REGISTER FORM */}
        <form onSubmit={registerStudent} className="space-y-2">
          <input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2" />
          <input placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full border p-2" />
          <input placeholder="Section" value={section} onChange={e => setSection(e.target.value)} className="w-full border p-2" />
          <input placeholder="Year" value={year} onChange={e => setYear(e.target.value)} className="w-full border p-2" />

          <button className="w-full bg-blue-600 text-white p-2">
            Register Student
          </button>
        </form>

        {/* CAMERA */}
        <video ref={videoRef} width={320} height={240} className="border" />

        <div className="flex gap-2">
          <button onClick={startCamera} className="bg-green-600 text-white px-2">Start</button>
          <button onClick={stopCamera} className="bg-red-600 text-white px-2">Stop</button>
          <button onClick={registerFace} className="bg-blue-600 text-white px-2">Register Face</button>
        </div>

        <p>Models: {modelsLoaded ? "Loaded" : "Loading..."}</p>

      </main>
    </div>
  );
}