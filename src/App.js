import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  CheckCircle,
  AlertCircle,
  FileText,
  Lock,
  Activity,
  Eye,
  HeartPulse,
} from "lucide-react";

// ==========================================
// SYSTEM CONFIGURATION
// ==========================================
// PASTE YOUR NEW GOOGLE APPS SCRIPT WEB APP URL HERE:
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbyVGHam435-SRLxKrAR5ANcwU8201w8IOqRg7USIkodVmu_9jk79gGnokikkPZdI42e/exec";
const CLINIC_PIN = "2026"; // PIN required for Doctor access

// --- MAIN APP COMPONENT ---
export default function App() {
  const [view, setView] = useState("patient"); // 'patient', 'endo', 'surgeon'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [db, setDb] = useState([]);
  const [alertQueue, setAlertQueue] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  const fetchDatabase = async () => {
    if (GAS_URL.includes("YOUR_WEB_APP_URL")) return;
    setIsFetching(true);
    try {
      const response = await fetch(GAS_URL);
      const result = await response.json();
      if (result.status === "success") setDb(result.data);
    } catch (error) {
      triggerAlert("Network Error: Could not fetch EMR data.");
    }
    setIsFetching(false);
  };

  useEffect(() => {
    if (view !== "patient" && isAuthenticated) {
      fetchDatabase();
      const interval = setInterval(fetchDatabase, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [view, isAuthenticated]);

  const triggerAlert = (msg) => {
    setAlertQueue((prev) => [...prev, msg]);
    setTimeout(() => setAlertQueue((prev) => prev.slice(1)), 5000);
  };

  const updatePatientStatus = async (id, newStatus) => {
    setDb(db.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    try {
      await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "update", id, status: newStatus }),
      });
      triggerAlert(`Updated ${id} to ${newStatus}`);
    } catch (e) {
      triggerAlert("Failed to sync with server.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {alertQueue.map((msg, idx) => (
          <div
            key={idx}
            className="bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-fade-in-up"
          >
            <CheckCircle size={18} />
            <span className="font-medium text-sm">{msg}</span>
          </div>
        ))}
      </div>

      {/* Top Navigation */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Eye className="text-blue-600" />
            EndoClearance{" "}
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
              Pilot
            </span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setView("patient");
                setIsAuthenticated(false);
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "patient"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Patient
            </button>
            <button
              onClick={() => setView("endo")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "endo"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Endo
            </button>
            <button
              onClick={() => setView("surgeon")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "surgeon"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Surgeon
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-6">
        {view === "patient" && <PatientWorkflow triggerAlert={triggerAlert} />}
        {view !== "patient" && !isAuthenticated && (
          <DoctorLogin onLogin={() => setIsAuthenticated(true)} />
        )}
        {view !== "patient" && isAuthenticated && (
          <DoctorDashboard
            role={view}
            data={db}
            isFetching={isFetching}
            updateStatus={updatePatientStatus}
          />
        )}
      </main>
    </div>
  );
}

// --- DOCTOR LOGIN ---
function DoctorLogin({ onLogin }) {
  const [pin, setPin] = useState("");
  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === CLINIC_PIN) onLogin();
    else alert("Incorrect PIN.");
  };

  return (
    <div className="max-w-sm mx-auto mt-16 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-center mb-4">
        <Lock className="text-slate-400" size={40} />
      </div>
      <h2 className="text-2xl font-semibold text-center mb-6">
        Secure Clinic Access
      </h2>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter 4-Digit PIN"
          className="px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center text-lg tracking-widest"
        />
        <button
          type="submit"
          className="bg-slate-800 text-white py-3 rounded-lg font-medium hover:bg-slate-700 transition-colors"
        >
          Unlock Dashboard
        </button>
      </form>
    </div>
  );
}

// --- PATIENT WORKFLOW ---
function PatientWorkflow({ triggerAlert }) {
  const [step, setStep] = useState(1);
  const [patientId, setPatientId] = useState("");
  const [scannedData, setScannedData] = useState({
    rbs: "",
    hba1c: "",
    date: "",
  });
  const [manualData, setManualData] = useState({ bp: "", symptoms: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [tesseractReady, setTesseractReady] = useState(false);
  const fileInputRef = useRef(null);

  // Dynamically load Tesseract.js from CDN
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.onload = () => setTesseractReady(true);
    document.body.appendChild(script);
  }, []);

  const handleFileUpload = async (e) => {
    if (!tesseractReady) {
      alert("AI Engine is still loading. Please wait a second and try again.");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const {
        data: { text },
      } = await window.Tesseract.recognize(file, "eng", {
        logger: (m) => console.log(m),
      });

      if (step === 1) {
        const idMatch = text.match(/(FC\d{6}|CR\d{10}|Endo\d{6})/i);
        if (idMatch) {
          setPatientId(idMatch[0].toUpperCase());
          setStep(2);
        } else {
          alert(
            "Could not detect a valid PGI ID (FC, CR, or Endo). Please ensure the card is clear and brightly lit."
          );
        }
      } else if (step === 2) {
        const rbsMatch = text.match(/(?:RBS|Random|Sugar)[\s:]*(\d{2,3})/i);
        const hba1cMatch = text.match(
          /(?:HbA1c|Glycated)[\s:]*(\d{1,2}\.\d{1,2})/i
        );
        const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);

        if (rbsMatch && hba1cMatch) {
          setScannedData({
            rbs: rbsMatch[1],
            hba1c: hba1cMatch[1],
            date: dateMatch ? dateMatch[1] : new Date().toLocaleDateString(),
          });
          setStep(3);
        } else {
          alert(
            "Could not detect both RBS and HbA1c values. Please ensure the full report is visible."
          );
        }
      }
    } catch (err) {
      alert("Error scanning image. Please try again.");
    }
    setIsProcessing(false);
  };

  const submitData = async () => {
    if (!manualData.bp || !manualData.symptoms) {
      alert("Please fill in your Blood Pressure and current symptoms.");
      return;
    }
    setIsProcessing(true);
    try {
      const payload = {
        action: "create",
        id: patientId,
        rbs: scannedData.rbs,
        hba1c: scannedData.hba1c,
        bp: manualData.bp,
        symptoms: manualData.symptoms,
        date: scannedData.date,
      };

      await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      triggerAlert(
        "Medical profile securely submitted for surgical clearance."
      );
      setStep(4);
    } catch (e) {
      alert("Network Error. Please try submitting again.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center text-sm font-medium text-slate-400">
        <span className={step >= 1 ? "text-blue-600 font-bold" : ""}>
          1. ID Scan
        </span>
        <span className={step >= 2 ? "text-blue-600 font-bold" : ""}>
          2. Lab Report
        </span>
        <span className={step >= 3 ? "text-blue-600 font-bold" : ""}>
          3. Vitals & Symptoms
        </span>
      </div>

      <div className="p-8">
        {step === 1 && (
          <div className="text-center animate-fade-in">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="text-blue-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Scan Hospital Card</h2>
            <p className="text-slate-500 mb-8">
              Upload a clear photo of your PGI Card to verify your ID.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {isProcessing
                ? "Scanning Engine Active..."
                : "Open Camera / Gallery"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center animate-fade-in">
            <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-purple-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Scan Blood Report</h2>
            <p className="text-slate-500 mb-6">
              Patient Verified:{" "}
              <span className="font-bold text-slate-800">{patientId}</span>
            </p>
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-sm text-left mb-6 flex gap-3 items-start">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p>
                Manual typing of lab values is disabled for clinical accuracy.
                Please upload the physical lab document.
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={isProcessing}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {isProcessing ? "Extracting Lab Data..." : "Upload Lab Report"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <HeartPulse className="text-red-500" /> Clinical Verification
            </h2>

            {/* Locked Extracted Data */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  RBS (mg/dL)
                </label>
                <div className="text-2xl font-bold text-slate-800 mt-1">
                  {scannedData.rbs}{" "}
                  <Lock size={14} className="inline text-slate-400" />
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  HbA1c (%)
                </label>
                <div className="text-2xl font-bold text-slate-800 mt-1">
                  {scannedData.hba1c}{" "}
                  <Lock size={14} className="inline text-slate-400" />
                </div>
              </div>
            </div>

            {/* Manual Inputs */}
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Blood Pressure (mmHg)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 130/80"
                  value={manualData.bp}
                  onChange={(e) =>
                    setManualData({ ...manualData, bp: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Current Symptoms / Chief Complaint
                </label>
                <textarea
                  placeholder="e.g. Sudden drop in vision OD, or frequent dizziness in the morning..."
                  value={manualData.symptoms}
                  onChange={(e) =>
                    setManualData({ ...manualData, symptoms: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[100px]"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Please note any specific eye (OD/OS) issues or general
                  discomfort.
                </p>
              </div>
            </div>

            <button
              onClick={submitData}
              disabled={isProcessing}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition shadow-md disabled:opacity-70"
            >
              {isProcessing
                ? "Submitting securely..."
                : "Submit to Surgical Team"}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-8 animate-fade-in">
            <CheckCircle className="text-emerald-500 mx-auto mb-4" size={64} />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Submission Successful
            </h2>
            <p className="text-slate-600">
              Your clinical data has been securely transmitted to the AEC
              surgical and endocrinology teams. You will be notified regarding
              your clearance status shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- DOCTOR DASHBOARD ---
function DoctorDashboard({ role, data, isFetching, updateStatus }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Activity
            className={role === "endo" ? "text-purple-600" : "text-blue-600"}
          />
          {role === "endo" ? "Endocrinology Triage" : "VR Surgical Queue"}
        </h2>
        {isFetching && (
          <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-full animate-pulse">
            Syncing...
          </span>
        )}
      </div>

      <div className="space-y-4">
        {data.length === 0 && !isFetching && (
          <p className="text-center text-slate-500 py-8">
            No patients in queue.
          </p>
        )}
        {data.map((patient, idx) => (
          <div
            key={idx}
            className="border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow bg-slate-50"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-bold text-lg text-slate-800">
                  {patient.id}
                </span>
                <span className="text-xs text-slate-500 ml-2 block sm:inline">
                  Report: {patient.date}
                </span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                  patient.status.includes("GREEN")
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {patient.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="text-slate-500 text-xs block">RBS</span>
                <span className="font-semibold">{patient.rbs}</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="text-slate-500 text-xs block">HbA1c</span>
                <span className="font-semibold">{patient.hba1c}</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-100">
                <span className="text-slate-500 text-xs block">BP</span>
                <span className="font-semibold">{patient.bp}</span>
              </div>
            </div>

            {/* NEW SYMPTOM BOX FOR CLINICIAN REVIEW */}
            <div className="bg-white p-3 rounded-lg border border-red-100 mb-4">
              <span className="text-xs font-bold text-red-800 uppercase tracking-wider block mb-1">
                Patient Reported Symptoms
              </span>
              <p className="text-sm text-slate-700 italic">
                "{patient.symptoms}"
              </p>
            </div>

            {role === "endo" && !patient.status.includes("GREEN") && (
              <div className="pt-3 border-t border-slate-200">
                <button
                  onClick={() => updateStatus(patient.id, "CLEARED / GREEN")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Grant Force Clearance (Post-OHA Adjust)
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
