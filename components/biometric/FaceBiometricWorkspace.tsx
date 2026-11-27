"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,

  CircleAlert,
  Clock3,
  Eye,
  LoaderCircle,
  MapPin,
  UserRound,
  Video,
  VideoOff,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SkeletonBlock } from "@/components/hrms/Skeleton";
import { badgeClass, buttonClass, cardClass, modalClass, pageTitleClass, type BadgeTone, pageBgClass } from "@/components/ui/styles";
import { createClient } from "@/utils/supabase/client";

type Mode = "enrollment" | "attendance";
type ChallengeId = "left" | "right" | "up" | "down" | "blink";
type ScanState = "idle" | "loading" | "ready" | "scanning" | "complete" | "error";
type HorizontalDirection = "positive" | "negative";
type FaceMeshPoint = { x: number; y: number };

type HumanFace = {
  embedding?: number[];
  boxScore?: number;
  faceScore?: number;
  live?: number;
  box?: [number, number, number, number];
  mesh?: FaceMeshPoint[];
  rotation?: { angle: { yaw: number; pitch: number } } | null;
};

type HumanResult = {
  face: HumanFace[];
  gesture: Array<{ gesture: string }>;
};

type HumanInstance = {
  version: string;
  load: () => Promise<void>;
  warmup?: () => Promise<unknown>;
  detect: (input: HTMLVideoElement) => Promise<HumanResult>;
};

type CapturedFaceSample = { blob: Blob; descriptor: number[] };

type FaceTemplate = {
  descriptors: number[][];
  createdAt: string;
  modelVersion: string;
  embeddingModel: "insightface-mobilenet-swish" | "face-api-js-face-recognition-net";
  samplePaths: string[];
};

type DailyAttendance = {
  id: string;
  clock_in: string;
  clock_out: string | null;
};

type AttendanceLocationPayload = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

type CurrentUser = {
  id: string;
  email: string | null;
  b2RegisterId: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
};

type B2EmployeeContext = {
  employee_uuid: string;
  employee_code: string | null;
  full_name: string | null;
  email: string | null;
};

// Cosine similarity for the InsightFace embedding. This is a provisional
// security threshold and must be calibrated with genuine and impostor tests.
// InsightFace receives the detected face crop, not clothing. A slightly more
// tolerant threshold handles normal hairstyle/forehead changes while liveness
// plus seven consecutive matching frames still protect the attendance action.
const MIN_IDENTITY_SIMILARITY = 0.66;
const FAST_IDENTITY_SIMILARITY = 0.78;
const REQUIRED_STABLE_MATCHES = 7;
const FAST_REQUIRED_STABLE_MATCHES = 4;
const SIMILARITY_WINDOW_SIZE = 5;
// Liveness runs in ordinary laptop/mobile cameras, whose pose output is often
// intermittent while a user turns their head. Keep a real movement challenge,
// but do not require an exaggerated pose or a long uninterrupted hold.
const CHALLENGE_HOLD_DURATION_MS = 250;
const BLINK_CONFIRMATION_FRAMES = 1;
const ENROLLMENT_CENTER_HOLD_MS = 700;
const FACE_SAMPLE_CAPTURE_INTERVAL_MS = 650;
const REQUIRED_FACE_SAMPLES = 9;
const MAX_TEMPLATE_SAMPLES = 18;
// Face matching uses all descriptor samples. The database intentionally keeps
// only five raw photos as private audit evidence, so an enrollment must not
// attempt to upload one photo for every descriptor.
const RAW_AUDIT_SAMPLE_COUNT = 5;
const STORAGE_UPLOAD_TIMEOUT_MS = 12000;
const TEMPLATE_TOP_MATCHES = 3;
const REQUIRED_LIVENESS_CHALLENGES = 2;
const MIN_ENROLLMENT_SAMPLE_SIMILARITY = 0.62;
const ATTENDANCE_VERIFICATION_TIMEOUT_MS = 15000;
// Maximum scan time, counted from the moment the camera is live and scanning
// starts (BUG-D3-019, BUG-D3-020; UC-D3-FBA-001 E-2, UC-D3-FBA-002/003 E-3).
// Registration must finish saving and attendance must reach a verified face
// within this time; otherwise the scan stops and nothing is recorded.
const ENROLLMENT_SCAN_TIMEOUT_MS = 90_000;
const ATTENDANCE_SCAN_TIMEOUT_MS = 60_000;

function waitForUpload<T>(upload: Promise<T>, language: "id" | "en", timeoutMs = STORAGE_UPLOAD_TIMEOUT_MS) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(language === "id" ? "Unggahan ke penyimpanan privat terlalu lama." : "The upload to private storage took too long."));
    }, timeoutMs);

    upload.then(
      (result) => {
        window.clearTimeout(timeoutId);
        resolve(result);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

const challengeDetails: Record<ChallengeId, { label: string; helper: string }> = {
  left: { label: "Hadap kiri", helper: "Putar wajah sedikit ke kiri." },
  right: { label: "Hadap kanan", helper: "Putar wajah sedikit ke kanan." },
  up: { label: "Lihat atas", helper: "Angkat kepala sedikit ke atas." },
  down: { label: "Lihat bawah", helper: "Turunkan kepala sedikit ke bawah." },
  blink: { label: "Kedip", helper: "Kedipkan salah satu mata satu kali." },
};

// Human reports head rotation in radians, while the UX thresholds below are
// easier to reason about in degrees. Keeping the conversion explicit avoids a
// 15-radian comparison that would never be reached by a normal head turn.
const degreesToRadians = (degrees: number) => degrees * (Math.PI / 180);
const CENTER_YAW_THRESHOLD = degreesToRadians(10);
const CENTER_PITCH_THRESHOLD = degreesToRadians(10);
const TURN_YAW_THRESHOLD = degreesToRadians(8);
const TILT_PITCH_THRESHOLD = degreesToRadians(7);

const FACE_OVERLAY_PATHS = [
  [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],
  [33, 160, 158, 133, 153, 144, 33],
  [362, 385, 387, 263, 373, 380, 362],
  [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61],
  [168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 168],
];

function shuffleChallenges() {
  const values: ChallengeId[] = ["left", "right", "up", "down", "blink"];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values.slice(0, REQUIRED_LIVENESS_CHALLENGES);
}

function getJakartaDate(timestamp = new Date()) {
  const values = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);
  const part = (type: Intl.DateTimeFormatPartTypes) => values.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatJakartaTime(timestamp: string, language: "id" | "en") {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function requestAttendanceLocation(language: "id" | "en"): Promise<AttendanceLocationPayload> {
  const text = (indonesian: string, english: string) => language === "id" ? indonesian : english;
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new Error(text("Perangkat ini tidak mendukung lokasi. Gunakan perangkat atau browser yang mendukung GPS.", "This device does not support location. Use a device or browser with GPS support.")));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
      }),
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? text("Izin lokasi diperlukan untuk mencatat clock-in atau clock-out.", "Location permission is required to record clock-in or clock-out.")
          : error.code === error.TIMEOUT
            ? text("Lokasi belum ditemukan tepat waktu. Pastikan GPS aktif lalu coba kembali.", "Location was not found in time. Make sure GPS is on and try again.")
            : text("Lokasi belum dapat dibaca. Pastikan GPS dan koneksi perangkat aktif.", "Location could not be read. Make sure GPS and the device connection are on.");
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 15_000 },
    );
  });
}

function RealtimeAttendanceClock({ variant = "header", frozenAt = null }: { variant?: "header" | "inline"; frozenAt?: Date | null }) {
  const { language } = useLanguage();
  // Do not read the current time during SSR. The server and browser can cross
  // a second boundary before hydration, which would make their initial text
  // differ and trigger a recoverable hydration error.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (frozenAt) return;

    const updateClock = () => setNow(new Date());
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [frozenAt]);

  const displayTime = frozenAt ?? now;
  const time = displayTime
    ? new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(displayTime)
    : null;
  const date = displayTime
    ? new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", { timeZone: "Asia/Jakarta", weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(displayTime)
    : null;

  if (variant === "inline") {
    return time ? <p className="mt-0.5 text-[11px] font-bold tabular-nums text-blue-700">{time} WIB</p> : <SkeletonBlock className="mt-1 h-3 w-24" />;
  }

  return (
    <div className={`${cardClass} flex items-center justify-center gap-3 px-5 py-3 text-center`}>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Clock3 size={18} /></div>
      <div>
        <p className="text-[11px] font-semibold text-slate-500">{language === "id" ? "Waktu presensi · WIB" : "Attendance time · WIB"}</p>
        {time ? <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-2xl">{time}</p> : <SkeletonBlock className="mx-auto mt-1.5 h-6 w-28" />}
        {date ? <p className="mt-0.5 text-[11px] font-medium text-slate-500">{date}</p> : <SkeletonBlock className="mx-auto mt-1.5 h-2.5 w-40" />}
      </div>
    </div>
  );
}

function cosineSimilarity(first: number[], second: number[]) {
  if (first.length !== second.length || first.length === 0) return 0;
  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;
  for (let index = 0; index < first.length; index += 1) {
    dotProduct += first[index] * second[index];
    firstMagnitude += first[index] * first[index];
    secondMagnitude += second[index] * second[index];
  }
  if (firstMagnitude === 0 || secondMagnitude === 0) return 0;
  return Math.max(-1, Math.min(1, dotProduct / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude))));
}

function templateSimilarity(embedding: number[], descriptors: number[][]) {
  const scores = descriptors
    .filter((descriptor) => descriptor.length === embedding.length)
    .map((descriptor) => cosineSimilarity(embedding, descriptor))
    .sort((first, second) => second - first);
  if (scores.length === 0) return 0;

  // The reference contains frontal and liveness-pose samples. A live frontal
  // frame should be compared to its closest compatible references, not to an
  // average polluted by profiles, lighting, or a different camera sensor.
  // We still require three supporting samples, never just the best one.
  const nearest = scores.slice(0, Math.min(TEMPLATE_TOP_MATCHES, scores.length));
  return median(nearest);
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export default function FaceBiometricWorkspace({ mode }: { mode: Mode }) {
  const { t, language } = useLanguage();
  const copy = language === "id" ? {
    savingRegistration: "Menyimpan registrasi biometrik", processingSample: "Memproses sampel wajah…", doNotClose: "Jangan menutup halaman sampai proses selesai.", registration: "Registrasi biometrik", registrationHelp: "Selesaikan liveness, lalu hadap lurus sampai sampel tersimpan.", liveIdentity: "Input identitas langsung", camera: "Kamera verifikasi", scanning: "MEMINDAI", preparing: "MENYIAPKAN MODEL", complete: "SELESAI", ready: "SIAP", faceRejected: "WAJAH TIDAK TERVERIFIKASI", cameraInactive: "Kamera belum aktif", cameraHelp: "Tekan mulai untuk memberi izin kamera dan memuat model.", liveness: "Liveness", recordingSample: "Merekam sampel", stayStill: "tetap diam", verifying: "Memverifikasi wajah…", faceVerified: "WAJAH TERVERIFIKASI", retry: "Coba kembali", preparingCamera: "Menyiapkan kamera & model…", cancelScan: "Batalkan pemindaian", startNewScan: "Mulai pemindaian baru", startCamera: "Mulai kamera", noTemplate: "Belum ada template untuk akun ini. Daftarkan biometrik.", verifiedFace: "Wajah terverifikasi", employee: "Karyawan", attendanceTime: "Waktu kehadiran", waitingClockIn: "Menunggu clock-in", location: "Lokasi", gpsReady: "GPS siap direkam", locationRecorded: "Titik lokasi dicatat saat tombol ditekan.", dayComplete: "Clock-in dan clock-out hari ini sudah lengkap.", continueToRecord: "Lanjutkan untuk mencatat presensi dan lokasi perangkat ini.", readingLocation: "Membaca lokasi…", attendanceComplete: "Presensi selesai", clockOutNow: "Clock-out sekarang", clockInNow: "Clock-in sekarang", rejectionHelp: "Pastikan pemilik akun yang terdaftar berada di depan kamera.", statusComplete: "Presensi hari ini selesai", statusWorking: "Sedang bekerja", statusReady: "Siap clock-in", identityLockActive: "Kunci identitas aktif", faceLock: "KUNCI WAJAH", timedOut: "WAKTU HABIS", timeLeft: (seconds: number) => `Sisa waktu pemindaian ${seconds} detik` } : {
    savingRegistration: "Saving biometric registration", processingSample: "Processing face samples…", doNotClose: "Do not close this page until the process is complete.", registration: "Biometric Registration", registrationHelp: "Complete liveness, then face forward until samples are saved.", liveIdentity: "Live identity input", camera: "Verification camera", scanning: "SCANNING", preparing: "PREPARING MODEL", complete: "COMPLETE", ready: "READY", faceRejected: "FACE NOT VERIFIED", cameraInactive: "Camera is inactive", cameraHelp: "Press start to allow camera access and load the model.", liveness: "Liveness", recordingSample: "Recording samples", stayStill: "stay still", verifying: "Verifying face…", faceVerified: "FACE VERIFIED", retry: "Try again", preparingCamera: "Preparing camera & model…", cancelScan: "Cancel scan", startNewScan: "Start a new scan", startCamera: "Start camera", noTemplate: "No template exists for this account. Register biometrics.", verifiedFace: "Face verified", employee: "Employee", attendanceTime: "Attendance time", waitingClockIn: "Waiting for clock-in", location: "Location", gpsReady: "GPS ready to record", locationRecorded: "Location is recorded when the button is pressed.", dayComplete: "Today's clock-in and clock-out are complete.", continueToRecord: "Continue to record attendance and this device's location.", readingLocation: "Reading location…", attendanceComplete: "Attendance complete", clockOutNow: "Clock out now", clockInNow: "Clock in now", rejectionHelp: "Make sure the registered account owner is in front of the camera.", statusComplete: "Today's attendance is complete", statusWorking: "Working", statusReady: "Ready to clock in", identityLockActive: "Identity lock active", faceLock: "FACE LOCK", timedOut: "TIME UP", timeLeft: (seconds: number) => `${seconds} seconds of scan time left` };
  const localized = useCallback((indonesian: string, english: string) => language === "id" ? indonesian : english, [language]);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const humanRef = useRef<HumanInstance | null>(null);
  const templateRef = useRef<FaceTemplate | null>(null);
  const frameRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);
  const latestEmbeddingRef = useRef<number[] | null>(null);
  const faceSamplePhotosRef = useRef<CapturedFaceSample[]>([]);
  const faceSampleCapturePendingRef = useRef(false);
  const lastFaceSampleCaptureAtRef = useRef(0);
  const facingCenterSinceRef = useRef<number | null>(null);
  const lastMeshRenderAtRef = useRef(0);
  const challengeOrderRef = useRef<ChallengeId[]>([]);
  const completedChallengesRef = useRef<ChallengeId[]>([]);
  const horizontalCalibrationRef = useRef<{ firstChallenge: "left" | "right"; direction: HorizontalDirection } | null>(null);
  const challengeStartedAtRef = useRef<number | null>(null);
  const challengeFramesRef = useRef(0);
  const stableMatchFramesRef = useRef(0);
  const mismatchFramesRef = useRef(0);
  const attendanceVerificationStartedAtRef = useRef<number | null>(null);
  const enrollmentSavingRef = useRef(false);
  const verificationLockedAtRef = useRef<number | null>(null);
  const similarityWindowRef = useRef<number[]>([]);
  const identityVerifiedRef = useRef(false);
  const matchScoreRef = useRef<number | null>(null);
  const qualityPassedRef = useRef(false);
  const attendancePresenceRef = useRef(false);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [template, setTemplate] = useState<FaceTemplate | null>(null);
  const [challengeOrder, setChallengeOrder] = useState<ChallengeId[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<ChallengeId[]>([]);
  const [faceCount, setFaceCount] = useState(0);
  const [faceConfidence, setFaceConfidence] = useState(0);
  const [livenessScore, setLivenessScore] = useState<number | undefined>();
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [stableMatchFrames, setStableMatchFrames] = useState(0);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [verificationLockedAt, setVerificationLockedAt] = useState<Date | null>(null);
  const [attendancePresence, setAttendancePresence] = useState(false);
  const [faceSampleCount, setFaceSampleCount] = useState(0);
  const [facingCenter, setFacingCenter] = useState(false);
  const [faceMesh, setFaceMesh] = useState<FaceMeshPoint[]>([]);
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
  const [hasEmbedding, setHasEmbedding] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<DailyAttendance | null>(null);
  const [isResolvingSession, setIsResolvingSession] = useState(true);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [savingStage, setSavingStage] = useState("");
  const [isAttendanceRejected, setIsAttendanceRejected] = useState(false);
  const [scanStartedAt, setScanStartedAt] = useState<number | null>(null);
  const [isScanTimedOut, setIsScanTimedOut] = useState(false);
  const [scanClock, setScanClock] = useState(() => Date.now());
  const [isRecordingAttendance, setIsRecordingAttendance] = useState(false);

  const isEnrollment = mode === "enrollment";
  const activeChallenge = challengeOrder.find((challenge) => !completedChallenges.includes(challenge));
  const allChallengesCompleted = challengeOrder.length > 0 && completedChallenges.length === challengeOrder.length;
  const matchPassed = isEnrollment || identityVerified;
  const enrollmentLivenessPassed = isEnrollment && allChallengesCompleted
    ? true
    : (livenessScore ?? 0) >= 0.6;
  const qualityPassed = faceCount === 1
    && faceConfidence >= 60
    && facingCenter
    && enrollmentLivenessPassed;
  const canFinalize = scanState === "scanning"
    && allChallengesCompleted
    && hasEmbedding
    && matchPassed
    && (isEnrollment ? qualityPassed && faceSampleCount >= REQUIRED_FACE_SAMPLES : attendancePresence);

  // The detection loop runs independently from React updates. Keep a UI-level
  // lock as well, so both attendance clocks freeze at the exact moment the
  // green verified state appears, even while the camera keeps rendering.
  useEffect(() => {
    if (isEnrollment || !identityVerified || !allChallengesCompleted || scanState !== "scanning" || verificationLockedAt) {
      return;
    }

    const timer = window.setTimeout(() => {
      const lockedAt = new Date();
      verificationLockedAtRef.current = lockedAt.getTime();
      setVerificationLockedAt(lockedAt);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [allChallengesCompleted, identityVerified, isEnrollment, scanState, verificationLockedAt]);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    isDetectingRef.current = false;
  }, []);

  // Scan deadline (BUG-D3-019 / BUG-D3-020). The deadline stops counting once
  // the scan has reached its goal in time: a verified face for attendance, or
  // the registration save for enrollment.
  const scanTimeoutMs = isEnrollment ? ENROLLMENT_SCAN_TIMEOUT_MS : ATTENDANCE_SCAN_TIMEOUT_MS;
  const scanGoalReached = isEnrollment ? isSavingTemplate : verificationLockedAt !== null;
  const scanDeadlineActive = scanState === "scanning" && scanStartedAt !== null && !scanGoalReached;

  useEffect(() => {
    if (!scanDeadlineActive || scanStartedAt === null) return;
    const remaining = Math.max(0, scanStartedAt + scanTimeoutMs - Date.now());
    const timer = window.setTimeout(() => {
      // Re-check through refs: the goal may have been reached in the same tick.
      if (isEnrollment ? enrollmentSavingRef.current : verificationLockedAtRef.current !== null) return;
      stopCamera();
      setScanState("error");
      setIsScanTimedOut(true);
      setErrorMessage(isEnrollment
        ? localized(
          "Waktu pemindaian habis (90 detik) dan wajah belum berhasil didaftarkan. Registrasi biometrik tidak disimpan. Tekan Coba kembali untuk mengulang.",
          "Scan time is up (90 seconds) and the face was not registered. The biometric registration was not saved. Press Try again to restart.",
        )
        : localized(
          "Waktu pemindaian habis (60 detik) dan wajah belum terverifikasi. Clock-in atau clock-out tidak dicatat. Tekan Coba kembali untuk mengulang.",
          "Scan time is up (60 seconds) and the face was not verified. No clock-in or clock-out was recorded. Press Try again to restart.",
        ));
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [isEnrollment, localized, scanDeadlineActive, scanStartedAt, scanTimeoutMs, stopCamera]);

  useEffect(() => {
    if (!scanDeadlineActive) return;
    const interval = window.setInterval(() => setScanClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [scanDeadlineActive]);

  const scanSecondsLeft = scanDeadlineActive && scanStartedAt !== null
    ? Math.max(0, Math.ceil((scanStartedAt + scanTimeoutMs - scanClock) / 1000))
    : null;

  const captureFaceSample = useCallback((video: HTMLVideoElement, box: HumanFace["box"], descriptor: number[]) => {
    if (!box || faceSampleCapturePendingRef.current || faceSamplePhotosRef.current.length >= REQUIRED_FACE_SAMPLES) return;
    const now = Date.now();
    if (now - lastFaceSampleCaptureAtRef.current < FACE_SAMPLE_CAPTURE_INTERVAL_MS) return;

    // A registration template must represent one stable face. The first
    // frame becomes the reference, then every later sample is accepted only
    // when it remains broadly consistent with the same person. The attendance
    // identity threshold stays separate and is not relaxed by this capture gate.
    const acceptedDescriptors = faceSamplePhotosRef.current.map((sample) => sample.descriptor);
    if (acceptedDescriptors.length > 0) {
      const nearestSimilarities = acceptedDescriptors
        .map((accepted) => cosineSimilarity(descriptor, accepted))
        .sort((first, second) => second - first)
        .slice(0, Math.min(2, acceptedDescriptors.length));
      const consistency = nearestSimilarities.reduce((sum, value) => sum + value, 0) / nearestSimilarities.length;
      if (consistency < MIN_ENROLLMENT_SAMPLE_SIMILARITY) return;
    }

    const [x, y, width, height] = box;
    const sourceWidth = video.videoWidth || 640;
    const sourceHeight = video.videoHeight || 480;
    const side = Math.min(Math.max(width, height) * 1.75, sourceWidth, sourceHeight);
    const sourceX = Math.max(0, Math.min(sourceWidth - side, x + width / 2 - side / 2));
    const sourceY = Math.max(0, Math.min(sourceHeight - side, y + height / 2 - side / 2));
    const canvas = document.createElement("canvas");
    // The embedding is created directly by Human from the video frame. These
    // smaller WebP files are only private audit images, so reducing them keeps
    // Storage uploads quick without lowering face-recognition accuracy.
    canvas.width = 256;
    canvas.height = 256;
    canvas.getContext("2d")?.drawImage(video, sourceX, sourceY, side, side, 0, 0, 256, 256);

    faceSampleCapturePendingRef.current = true;
    lastFaceSampleCaptureAtRef.current = now;
    canvas.toBlob((blob) => {
      faceSampleCapturePendingRef.current = false;
      if (!blob || faceSamplePhotosRef.current.length >= REQUIRED_FACE_SAMPLES) return;
      faceSamplePhotosRef.current = [...faceSamplePhotosRef.current, { blob, descriptor: [...descriptor] }];
      setFaceSampleCount(faceSamplePhotosRef.current.length);
    }, "image/webp", 0.82);
  }, []);

  const updateResult = useCallback((result: HumanResult) => {
    const now = Date.now();
    const face = result.face[0];
    const gestureNames = result.gesture.map((entry) => String(entry.gesture));
    const yaw = face?.rotation?.angle.yaw ?? 0;
    const pitch = face?.rotation?.angle.pitch ?? 0;
    const livenessFinished = challengeOrderRef.current.length > 0
      && completedChallengesRef.current.length === challengeOrderRef.current.length;
    const nextFaceConfidence = Math.round(((face?.faceScore ?? face?.boxScore ?? 0) * 100));
    const nextFacingCenter = gestureNames.includes("facing center") || (Math.abs(yaw) <= CENTER_YAW_THRESHOLD && Math.abs(pitch) <= CENTER_PITCH_THRESHOLD);
    // Liveness has already been proven by the completed challenges. Requiring
    // the live score to stay high for every later enrollment frame made sample
    // capture stall even with a stable face, especially on slower cameras.
    const livenessAccepted = isEnrollment && livenessFinished
      ? true
      : (face?.live ?? 0) >= 0.6;
    const baseQualityPassed = result.face.length === 1
      && nextFaceConfidence >= 60
      && livenessAccepted;
    const nextQualityPassed = baseQualityPassed && nextFacingCenter;
    setFaceCount(result.face.length);
    setFaceConfidence(nextFaceConfidence);
    setLivenessScore(face?.live);
    setFacingCenter(nextFacingCenter);
    if (Date.now() - lastMeshRenderAtRef.current >= 66) {
      setFaceMesh(face?.mesh ?? []);
      lastMeshRenderAtRef.current = Date.now();
    }
    qualityPassedRef.current = nextQualityPassed;
    attendancePresenceRef.current = baseQualityPassed;
    setAttendancePresence(baseQualityPassed);

    if (result.face.length !== 1 || !face?.embedding) {
      facingCenterSinceRef.current = null;
      latestEmbeddingRef.current = null;
      setHasEmbedding(false);
      if (!identityVerifiedRef.current) {
        setMatchScore(null);
        matchScoreRef.current = null;
      }
      if (!identityVerifiedRef.current) {
        stableMatchFramesRef.current = 0;
        mismatchFramesRef.current = 0;
        similarityWindowRef.current = [];
      }
      attendancePresenceRef.current = false;
      if (!identityVerifiedRef.current) {
        setStableMatchFrames(0);
        setIdentityVerified(false);
      }
      setAttendancePresence(false);
      setFaceMesh([]);
      return;
    }

    latestEmbeddingRef.current = face.embedding;
    setHasEmbedding(true);

    if (baseQualityPassed && nextFacingCenter) {
      facingCenterSinceRef.current ??= now;
    } else {
      facingCenterSinceRef.current = null;
    }

    const storedTemplate = templateRef.current;

    // Samples are captured only after liveness completes and the user is back
    // in a stable, front-facing pose. A sideways liveness frame must not
    // become the lone reference that blocks the next centered samples.
    if (
      isEnrollment
      && baseQualityPassed
      && nextFacingCenter
      && livenessFinished
      && facingCenterSinceRef.current !== null
      && now - facingCenterSinceRef.current >= ENROLLMENT_CENTER_HOLD_MS
      && faceSamplePhotosRef.current.length < REQUIRED_FACE_SAMPLES
    ) {
      const video = videoRef.current;
      if (video) captureFaceSample(video, face.box, face.embedding);
    }

    if (!isEnrollment && storedTemplate?.embeddingModel === "face-api-js-face-recognition-net") {
      setErrorMessage(localized("Template lama perlu didaftarkan ulang agar cocok dengan mesin pengenalan wajah saat ini.", "The legacy template must be enrolled again to work with the current face-recognition engine."));
      setMatchScore(null);
      identityVerifiedRef.current = false;
      setIdentityVerified(false);
    } else if (!isEnrollment && storedTemplate) {
      const rawSimilarity = templateSimilarity(face.embedding, storedTemplate.descriptors);
      const verificationThreshold = MIN_IDENTITY_SIMILARITY;
      const fastVerificationThreshold = FAST_IDENTITY_SIMILARITY;
      const similarityWindow = [...similarityWindowRef.current, rawSimilarity].slice(-SIMILARITY_WINDOW_SIZE);
      similarityWindowRef.current = similarityWindow;
      const smoothedSimilarity = median(similarityWindow);

      const wasVerified = identityVerifiedRef.current;
      if (!wasVerified) {
        const verifiedFrame = nextQualityPassed && smoothedSimilarity >= verificationThreshold;
        stableMatchFramesRef.current = verifiedFrame
          ? Math.min(stableMatchFramesRef.current + 1, REQUIRED_STABLE_MATCHES)
          : 0;
        const requiredFrames = smoothedSimilarity >= fastVerificationThreshold
          ? FAST_REQUIRED_STABLE_MATCHES
          : REQUIRED_STABLE_MATCHES;
        identityVerifiedRef.current = stableMatchFramesRef.current >= requiredFrames;
        mismatchFramesRef.current = 0;
      } else {
        // Verification is intentionally locked for this scan after a stable
        // match. A transient camera frame must not make a verified user start
        // over; attendance still requires one live face at button press.
        mismatchFramesRef.current = 0;
      }

      if (!wasVerified) {
        setMatchScore(Math.round(smoothedSimilarity * 100));
        matchScoreRef.current = smoothedSimilarity;
        setStableMatchFrames(stableMatchFramesRef.current);
        setIdentityVerified(identityVerifiedRef.current);
      }
    } else if (!isEnrollment) {
      setMatchScore(null);
      matchScoreRef.current = null;
      stableMatchFramesRef.current = 0;
      mismatchFramesRef.current = 0;
      similarityWindowRef.current = [];
      identityVerifiedRef.current = false;
      setStableMatchFrames(0);
      setIdentityVerified(false);
    }

    if (!isEnrollment && identityVerifiedRef.current && allChallengesCompleted && verificationLockedAtRef.current === null) {
      verificationLockedAtRef.current = now;
      setVerificationLockedAt(new Date(now));
    }

    if (!isEnrollment && livenessFinished && storedTemplate && !identityVerifiedRef.current) {
      attendanceVerificationStartedAtRef.current ??= now;
      if (now - attendanceVerificationStartedAtRef.current >= ATTENDANCE_VERIFICATION_TIMEOUT_MS) {
        setErrorMessage(localized("Wajah tidak terverifikasi untuk akun ini. Pemindaian dihentikan; coba kembali dengan pemilik akun.", "The face could not be verified for this account. Scanning has stopped; try again with the account owner."));
        setIsAttendanceRejected(true);
        setScanState("error");
        stopCamera();
        return;
      }
    } else if (!isEnrollment && identityVerifiedRef.current) {
      attendanceVerificationStartedAtRef.current = null;
    }

    const target = challengeOrderRef.current.find((challenge) => !completedChallengesRef.current.includes(challenge));
    if (!target) {
      challengeStartedAtRef.current = null;
      challengeFramesRef.current = 0;
      return;
    }

    // Camera drivers and browser previews do not all report horizontal yaw in
    // the same direction. The first successful horizontal turn calibrates the
    // device; the remaining horizontal challenge must be the opposite turn.
    // This keeps the liveness requirement intact without a brittle left/right
    // convention that can leave users stuck on one instruction.
    const gestureByChallenge: Record<ChallengeId, string> = {
      left: "facing left",
      right: "facing right",
      up: "head up",
      down: "head down",
      blink: "blink",
    };
    const expected = gestureByChallenge[target];
    const gestureDetected = target === "blink"
      ? gestureNames.some((gesture) => gesture.startsWith(expected))
      : target === "left" || target === "right"
        ? false
        : gestureNames.includes(expected);
    const horizontalDirection: HorizontalDirection | null = yaw >= TURN_YAW_THRESHOLD
      ? "positive"
      : yaw <= -TURN_YAW_THRESHOLD
        ? "negative"
        : null;
    const horizontalDetected = target === "left" || target === "right"
      ? (() => {
        if (!horizontalDirection) return false;
        const calibration = horizontalCalibrationRef.current;
        if (!calibration) return true;
        const expectedDirection = target === calibration.firstChallenge
          ? calibration.direction
          : calibration.direction === "positive" ? "negative" : "positive";
        return horizontalDirection === expectedDirection;
      })()
      : false;
    const rotationDetected = target === "left" || target === "right"
      ? horizontalDetected
        : target === "up"
          ? pitch <= -TILT_PITCH_THRESHOLD
          : target === "down"
            ? pitch >= TILT_PITCH_THRESHOLD
            : false;
    const detected = gestureDetected || rotationDetected;

    // Liveness challenges verify visible motion. During a head turn the model
    // can briefly lose face detail, so challenge progress only requires a
    // single detected face and sufficient detector confidence.
    const challengeCanBeCompleted = detected
      && result.face.length === 1
      && nextFaceConfidence >= 50;
    let confirmedChallenge = false;

    if (!challengeCanBeCompleted) {
      challengeStartedAtRef.current = null;
      challengeFramesRef.current = 0;
    } else if (target === "blink") {
      challengeFramesRef.current += 1;
      confirmedChallenge = challengeFramesRef.current >= BLINK_CONFIRMATION_FRAMES;
    } else {
      if (challengeStartedAtRef.current === null) {
        challengeStartedAtRef.current = Date.now();
      }
      confirmedChallenge = Date.now() - challengeStartedAtRef.current >= CHALLENGE_HOLD_DURATION_MS;
    }

    if (confirmedChallenge) {
      if (!completedChallengesRef.current.includes(target)) {
        if ((target === "left" || target === "right") && horizontalDirection && !horizontalCalibrationRef.current) {
          horizontalCalibrationRef.current = { firstChallenge: target, direction: horizontalDirection };
        }
        const nextCompleted = [...completedChallengesRef.current, target];
        completedChallengesRef.current = nextCompleted;
        setCompletedChallenges(nextCompleted);
        challengeStartedAtRef.current = null;
        challengeFramesRef.current = 0;
      }
    }
  }, [captureFaceSample, isEnrollment, localized, stopCamera]);

  const startDetection = useCallback(() => {
    const loop = async () => {
      const video = videoRef.current;
      if (!video || !humanRef.current || !streamRef.current) return;

      if (!isDetectingRef.current && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        isDetectingRef.current = true;
        try {
          const result = await humanRef.current.detect(video);
          updateResult(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : localized("Model wajah gagal memproses kamera.", "The face model could not process the camera feed.");
          setErrorMessage(message);
        } finally {
          isDetectingRef.current = false;
        }
      }
      frameRef.current = window.requestAnimationFrame(loop);
    };
    frameRef.current = window.requestAnimationFrame(loop);
  }, [localized, updateResult]);

  const startScan = useCallback(async () => {
    setErrorMessage("");
    setActionMessage("");
    setIsAttendanceRejected(false);
    setIsScanTimedOut(false);
    setScanStartedAt(null);
    if (!currentUser) {
      setErrorMessage(localized("Sesi akun tidak ditemukan. Silakan login kembali.", "Account session not found. Please sign in again."));
      router.replace("/login");
      return;
    }
    const nextOrder = shuffleChallenges();
    challengeOrderRef.current = nextOrder;
    completedChallengesRef.current = [];
    setCompletedChallenges([]);
    setChallengeOrder(nextOrder);
    setFaceCount(0);
    setFaceConfidence(0);
    setLivenessScore(undefined);
    setMatchScore(null);
    matchScoreRef.current = null;
    setStableMatchFrames(0);
    setIdentityVerified(false);
    setVerificationLockedAt(null);
    setFaceSampleCount(0);
    setFacingCenter(false);
    setFaceMesh([]);
    setHasEmbedding(false);
    latestEmbeddingRef.current = null;
    faceSamplePhotosRef.current = [];
    faceSampleCapturePendingRef.current = false;
    lastFaceSampleCaptureAtRef.current = 0;
    facingCenterSinceRef.current = null;
    stableMatchFramesRef.current = 0;
    mismatchFramesRef.current = 0;
    similarityWindowRef.current = [];
    challengeStartedAtRef.current = null;
    challengeFramesRef.current = 0;
    horizontalCalibrationRef.current = null;
    attendanceVerificationStartedAtRef.current = null;
    verificationLockedAtRef.current = null;
    identityVerifiedRef.current = false;
    qualityPassedRef.current = false;
    attendancePresenceRef.current = false;
    setAttendancePresence(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanState("error");
      setErrorMessage(localized("Browser ini tidak mendukung akses kamera.", "This browser does not support camera access."));
      return;
    }

    try {
      setScanState("loading");
      const [{ default: Human }, stream] = await Promise.all([
        import("@vladmandic/human"),
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        }),
      ]);

      const humanConfig = {
        backend: "webgl",
        debug: false,
        cacheModels: true,
        modelBasePath: "https://vladmandic.github.io/human-models/models",
          filter: { enabled: true, equalization: true },
        face: {
          enabled: true,
          detector: { enabled: true, rotation: true, maxDetected: 1, minConfidence: 0.6 },
          mesh: { enabled: true },
          iris: { enabled: true },
          description: { enabled: false },
          insightface: {
            enabled: true,
            modelPath: "https://vladmandic.github.io/insightface/models/insightface-mobilenet-swish.json",
            skipFrames: 1,
            skipTime: 0,
          },
          antispoof: { enabled: false },
          liveness: { enabled: true },
        },
        gesture: { enabled: true },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false },
      };
      // InsightFace is supported by Human at runtime but is not declared in its
      // public FaceConfig type, so keep this feature flag outside that narrow type.
      const human = new Human(humanConfig as never) as unknown as HumanInstance;

      humanRef.current = human;
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setVideoDimensions({
          width: videoRef.current.videoWidth || 640,
          height: videoRef.current.videoHeight || 480,
        });
      }
      await Promise.all([
        human.load(),
        Promise.resolve(human.warmup?.()),
      ]);
      const startedAt = Date.now();
      setScanStartedAt(startedAt);
      setScanClock(startedAt);
      setScanState("scanning");
      startDetection();
    } catch (error) {
      stopCamera();
      setScanState("error");
      const message = error instanceof Error ? error.message : localized("Kamera atau model biometrik tidak dapat dimulai.", "The camera or biometric model could not be started.");
      setErrorMessage(message.includes("Permission") || message.includes("NotAllowed")
        ? localized("Izin kamera belum diberikan. Izinkan kamera lalu coba kembali.", "Camera permission has not been granted. Allow the camera and try again.")
        : message);
    }
  }, [currentUser, router, startDetection, stopCamera]);

  const resetScan = useCallback(() => {
    stopCamera();
    setScanState("idle");
    setIsAttendanceRejected(false);
    setIsScanTimedOut(false);
    setScanStartedAt(null);
    challengeOrderRef.current = [];
    completedChallengesRef.current = [];
    setCompletedChallenges([]);
    setChallengeOrder([]);
    setFaceCount(0);
    setFaceConfidence(0);
    setLivenessScore(undefined);
    setMatchScore(null);
    matchScoreRef.current = null;
    setStableMatchFrames(0);
    setIdentityVerified(false);
    setVerificationLockedAt(null);
    setFaceSampleCount(0);
    setFacingCenter(false);
    setFaceMesh([]);
    setHasEmbedding(false);
    latestEmbeddingRef.current = null;
    faceSamplePhotosRef.current = [];
    faceSampleCapturePendingRef.current = false;
    lastFaceSampleCaptureAtRef.current = 0;
    facingCenterSinceRef.current = null;
    stableMatchFramesRef.current = 0;
    mismatchFramesRef.current = 0;
    similarityWindowRef.current = [];
    challengeStartedAtRef.current = null;
    challengeFramesRef.current = 0;
    horizontalCalibrationRef.current = null;
    attendanceVerificationStartedAtRef.current = null;
    verificationLockedAtRef.current = null;
    identityVerifiedRef.current = false;
    qualityPassedRef.current = false;
    attendancePresenceRef.current = false;
    setAttendancePresence(false);
  }, [stopCamera]);

  const saveEnrollment = useCallback(async () => {
    if (!currentUser) return;
    if (!currentUser.employeeId) {
      setErrorMessage(localized("Profil lama untuk template biometrik belum tersedia. Data absensi tetap memakai akun B2; hubungi HR Admin untuk melengkapi template biometrik.", "The legacy profile required by the biometric template is not available yet. Attendance continues to use the B2 account; contact an HR administrator to complete biometric setup."));
      return;
    }
    if (faceSamplePhotosRef.current.length < REQUIRED_FACE_SAMPLES || !qualityPassedRef.current || completedChallengesRef.current.length !== challengeOrderRef.current.length) {
      setErrorMessage(localized(`Selesaikan liveness lalu hadap lurus ke kamera sampai ${REQUIRED_FACE_SAMPLES} sampel wajah otomatis terkumpul.`, `Complete liveness, then face the camera until ${REQUIRED_FACE_SAMPLES} face samples are collected automatically.`));
      return;
    }
    enrollmentSavingRef.current = true;
    setIsSavingTemplate(true);
    setSavingStage(localized("Memastikan sesi akun…", "Confirming account session…"));
    setErrorMessage("");
    const supabase = createClient();
    try {
      const samples = faceSamplePhotosRef.current;
      const descriptors = samples.map((sample) => sample.descriptor);

      if (descriptors.length !== REQUIRED_FACE_SAMPLES || descriptors.some((descriptor) => descriptor.length === 0)) {
        setErrorMessage(localized("Salah satu sampel wajah tidak dapat diproses. Mulai pemindaian baru lalu coba kembali.", "One face sample could not be processed. Start a new scan and try again."));
        return;
      }

      const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || sessionUser?.id !== currentUser.id) {
        setErrorMessage(localized("Sesi login tidak cocok untuk menyimpan sampel wajah. Login ulang lalu coba lagi.", "The sign-in session does not match the face-sample save operation. Sign in again and retry."));
        return;
      }

      const previousTemplate = templateRef.current;
      // A second registration from a different laptop supplements the current
      // account template instead of replacing it. Keep the newest two trusted
      // registration sessions (18 samples) to cover camera variation without
      // allowing the template to grow forever.
      const reusablePrevious = previousTemplate?.embeddingModel === "insightface-mobilenet-swish"
        ? previousTemplate
        : null;
      const previousDescriptors = reusablePrevious?.descriptors ?? [];
      const previousPaths = reusablePrevious?.samplePaths ?? [];
      const retainedDescriptorCount = Math.max(0, MAX_TEMPLATE_SAMPLES - descriptors.length);
      const retainedDescriptors = previousDescriptors.slice(-retainedDescriptorCount);
      const retainedPaths = previousPaths.slice(-RAW_AUDIT_SAMPLE_COUNT);

      const nextTemplate: FaceTemplate = {
        descriptors: [...retainedDescriptors, ...descriptors.filter((descriptor): descriptor is number[] => Boolean(descriptor))],
        createdAt: new Date().toISOString(),
        modelVersion: "human-3.3.6-insightface",
        embeddingModel: "insightface-mobilenet-swish",
        samplePaths: retainedPaths,
      };

      const saveTemplate = async (samplePaths: string[]) => supabase
        .from("d3_face_biometric_templates")
        .upsert({
          employee_id: currentUser.employeeId,
          auth_user_id: currentUser.id,
          embedding_model: nextTemplate.embeddingModel,
          embedding_version: 3,
          descriptors: nextTemplate.descriptors,
          sample_paths: samplePaths,
          enrollment_quality: {
            face_confidence: faceConfidence,
            liveness_score: livenessScore ?? null,
            descriptor_sample_count: nextTemplate.descriptors.length,
            photo_audit_sample_count: samplePaths.length,
          },
          enrolled_at: nextTemplate.createdAt,
          updated_at: nextTemplate.createdAt,
        }, { onConflict: "employee_id" });

      // The descriptor template is the data used for recognition. Save it
      // before optional private photo archival, so a slow Storage request can
      // never trap the enrollment flow behind a loading modal.
      setSavingStage(localized("Menyimpan template pengenalan wajah…", "Saving face-recognition template…"));
      const { error: templateError } = await saveTemplate(retainedPaths);
      if (templateError) {
        setErrorMessage(templateError.code === "42501"
          ? localized("Akun ini belum memiliki akses employee yang sesuai untuk menyimpan biometrik.", "This account does not have the matching employee access needed to save biometrics.")
          : templateError.code === "23514"
            ? localized("Template biometrik tidak memenuhi aturan jumlah sampel. Mulai pemindaian baru lalu coba lagi.", "The biometric template does not meet the sample-count rule. Start a new scan and try again.")
            : localized("Template biometrik belum dapat disimpan. Periksa koneksi lalu coba kembali.", "The biometric template could not be saved. Check your connection and try again."));
        return;
      }

      templateRef.current = nextTemplate;
      setTemplate(nextTemplate);

      // Store five compact audit photos at most. Nine descriptors remain in
      // the template for recognition, while the table's sample_paths limit is
      // respected. A timed-out upload is cleaned up if it later completes.
      const enrollmentId = crypto.randomUUID();
      const auditSamples = samples.slice(0, RAW_AUDIT_SAMPLE_COUNT);
      const auditPaths = auditSamples.map((_, index) => `${currentUser.id}/${enrollmentId}/sample-${index + 1}.webp`);
      const uploadedPaths: string[] = [];
      let storageFailure = "";

      for (let index = 0; index < auditPaths.length; index += 1) {
        setSavingStage(language === "id" ? `Menyimpan foto audit ${index + 1} dari ${auditPaths.length}…` : `Saving audit photo ${index + 1} of ${auditPaths.length}…`);
        const path = auditPaths[index];
        const photo = new File([auditSamples[index].blob], `sample-${index + 1}.webp`, { type: "image/webp" });
        const uploadPromise = supabase.storage
          .from("d3-biometric-face-samples")
          .upload(path, photo, { contentType: "image/webp", cacheControl: "31536000", upsert: false });

        try {
          const { error: uploadError } = await waitForUpload(uploadPromise, language);
          if (uploadError) {
            storageFailure = uploadError.message;
            break;
          }
          uploadedPaths.push(path);
        } catch (uploadError) {
          // The browser request cannot reliably be aborted by supabase-js.
          // Remove an object later if that timed-out request eventually wins.
          void uploadPromise.then(({ error }) => {
            if (!error) void supabase.storage.from("d3-biometric-face-samples").remove([path]);
          });
          storageFailure = uploadError instanceof Error ? uploadError.message : localized("Unggahan foto audit tidak dapat diselesaikan.", "The audit-photo upload could not be completed.");
          break;
        }
      }

      if (storageFailure) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from("d3-biometric-face-samples").remove(uploadedPaths);
        }
        setScanState("complete");
        setActionMessage(language === "id" ? `Template wajah berhasil tersimpan. Arsip foto privat belum lengkap (${storageFailure}); pendaftaran tetap dapat dipakai untuk presensi.` : `The face template was saved. Its private photo archive is incomplete (${storageFailure}); enrollment can still be used for attendance.`);
        stopCamera();
        return;
      }

      setSavingStage(localized("Menyimpan arsip foto privat…", "Saving private photo archive…"));
      const { error: archiveError } = await saveTemplate(auditPaths);
      if (archiveError) {
        await supabase.storage.from("d3-biometric-face-samples").remove(uploadedPaths);
        setScanState("complete");
        setActionMessage(localized("Template wajah berhasil tersimpan, tetapi arsip foto privat belum dapat dilengkapi.", "The face template was saved, but its private photo archive could not be completed."));
        stopCamera();
        return;
      }

      const finalizedTemplate = { ...nextTemplate, samplePaths: auditPaths };
      templateRef.current = finalizedTemplate;
      setTemplate(finalizedTemplate);
      if (previousPaths.length > 0) {
        await supabase.storage.from("d3-biometric-face-samples").remove(previousPaths);
      }
      setScanState("complete");
      setActionMessage(previousTemplate
        ? localized("Sampel biometrik dari perangkat ini berhasil ditambahkan ke template akun.", "Biometric samples from this device were added to the account template.")
        : localized("Template biometrik multi-kondisi berhasil tersimpan.", "The multi-condition biometric template was saved."));
      stopCamera();
    } finally {
      enrollmentSavingRef.current = false;
      setIsSavingTemplate(false);
      setSavingStage("");
    }
  }, [currentUser, faceConfidence, language, livenessScore, localized, stopCamera]);

  useEffect(() => {
    if (!isEnrollment || !canFinalize || isSavingTemplate || scanState !== "scanning") return;
    // The controlled enrollment flow commits exactly once when all samples pass.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void saveEnrollment();
  }, [canFinalize, isEnrollment, isSavingTemplate, saveEnrollment, scanState]);

  const recordAttendance = useCallback(async () => {
    if (!identityVerifiedRef.current || !attendancePresenceRef.current || completedChallengesRef.current.length !== challengeOrderRef.current.length) {
      setErrorMessage(localized("Identitas belum tervalidasi stabil. Pastikan satu wajah hidup yang terdaftar masih terlihat, lalu selesaikan pemeriksaan liveness.", "Identity is not yet stably verified. Keep one enrolled live face visible, then complete liveness checking."));
      return;
    }
    if (!currentUser || matchScoreRef.current === null) return;
    setIsRecordingAttendance(true);
    setErrorMessage("");
    try {
      // The browser asks permission at this point only. The app never tracks a
      // user in the background or after this attendance action is finished.
      const location = await requestAttendanceLocation(language);
      const supabase = createClient();
      const recordedAt = new Date().toISOString();
      const attendanceDate = getJakartaDate();
      const { data: existingAttendance, error: lookupError } = await supabase
        .from("d3_attendances")
        .select("id, clock_in, clock_out")
        .eq("b2_register_id", currentUser.b2RegisterId)
        .eq("date", attendanceDate)
        .maybeSingle();

      if (lookupError) {
        setErrorMessage(localized("Riwayat presensi belum dapat diperiksa. Periksa koneksi lalu coba kembali.", "Attendance history could not be checked. Check your connection and try again."));
        return;
      }

      let type: "CLOCK_IN" | "CLOCK_OUT";
      if (!existingAttendance) {
        type = "CLOCK_IN";
        const { error } = await supabase
          .from("d3_attendances")
          .insert({
            b2_register_id: currentUser.b2RegisterId,
            date: attendanceDate,
            clock_in: recordedAt,
            clock_in_latitude: location.latitude,
            clock_in_longitude: location.longitude,
            clock_in_accuracy_meters: location.accuracyMeters,
            status: "PRESENT",
            notes: "Face biometric verification",
          });
        if (error) {
          setErrorMessage(localized("Clock-in belum dapat dicatat ke riwayat presensi. Periksa koneksi lalu coba kembali.", "Clock-in could not be recorded in attendance history. Check your connection and try again."));
          return;
        }
        setTodayAttendance({ id: "", clock_in: recordedAt, clock_out: null });
      } else {
        const todayAttendance = existingAttendance as DailyAttendance;
        if (todayAttendance.clock_out) {
          setErrorMessage(localized("Clock-in dan clock-out hari ini sudah tercatat di riwayat presensi.", "Today's clock-in and clock-out are already recorded in attendance history."));
          return;
        }
        type = "CLOCK_OUT";
        const { error } = await supabase
          .from("d3_attendances")
          .update({
            clock_out: recordedAt,
            clock_out_latitude: location.latitude,
            clock_out_longitude: location.longitude,
            clock_out_accuracy_meters: location.accuracyMeters,
          })
          .eq("id", todayAttendance.id);
        if (error) {
          setErrorMessage(localized("Clock-out belum dapat diperbarui di riwayat presensi. Periksa koneksi lalu coba kembali.", "Clock-out could not be updated in attendance history. Check your connection and try again."));
          return;
        }
        setTodayAttendance({ ...todayAttendance, clock_out: recordedAt });
      }

      // This is an audit trail for the biometric verification. The attendance
      // source of truth remains d3_attendances, owned by the attendance feature.
      const eventError = currentUser.employeeId
        ? (await supabase
          .from("d3_face_biometric_events")
          .insert({
            employee_id: currentUser.employeeId,
            auth_user_id: currentUser.id,
            event_type: type,
            similarity: matchScoreRef.current,
            liveness_score: livenessScore ?? null,
          })).error
        : { message: "Biometric audit requires a legacy employee mapping." };

      setScanState("complete");
      setActionMessage(language === "id" ? `${type === "CLOCK_IN" ? "Clock-in" : "Clock-out"} dan lokasi berhasil dicatat di Riwayat & Koreksi Presensi.${eventError ? " Audit biometrik belum tersimpan, tetapi data presensi sudah tercatat." : ""}` : `${type === "CLOCK_IN" ? "Clock-in" : "Clock-out"} and location were recorded in Attendance History & Correction.${eventError ? " The biometric audit was not saved, but attendance was recorded." : ""}`);
      stopCamera();
      window.setTimeout(() => router.push("/attendance"), 900);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : localized("Lokasi belum dapat dibaca. Coba kembali.", "Location could not be read. Please try again."));
    } finally {
      setIsRecordingAttendance(false);
    }
  }, [currentUser, language, livenessScore, localized, router, stopCamera]);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          router.replace("/login");
          return;
        }
        const { data: account, error: accountError } = await supabase
          .from("b2_register")
          .select("id, employee_id, full_name, email")
          .eq("auth_user_id", data.user.id)
          .eq("is_active", true)
          .maybeSingle();
        if (accountError || !account) {
          if (isMounted) setErrorMessage(localized("Profil B2 aktif belum dapat dimuat. Hubungi HR Admin.", "The active B2 profile could not be loaded. Contact an HR administrator."));
          return;
        }
        const { data: accountContext } = await supabase
          .rpc("d3_current_b2_employee_context")
          .maybeSingle();
        const b2Context = accountContext as B2EmployeeContext | null;

        const user: CurrentUser = {
          id: data.user.id,
          email: data.user.email ?? null,
          b2RegisterId: account.id,
          employeeId: b2Context?.employee_uuid ?? "",
          employeeCode: account.employee_id ?? b2Context?.employee_code ?? "—",
          fullName: account.full_name ?? b2Context?.full_name ?? account.email ?? b2Context?.email ?? data.user.email ?? (language === "id" ? "Pegawai" : "Employee"),
        };
        const { data: existingAttendance } = await supabase
          .from("d3_attendances")
          .select("id, clock_in, clock_out")
          .eq("b2_register_id", account.id)
          .eq("date", getJakartaDate())
          .maybeSingle();
        const { data: storedTemplate, error: templateError } = await supabase
          .from("d3_face_biometric_templates")
          .select("descriptors, enrolled_at, embedding_model, sample_paths")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (templateError && templateError.code !== "PGRST116") {
          if (isMounted) setErrorMessage(localized("Template biometrik belum dapat dimuat. Periksa koneksi lalu coba kembali.", "The biometric template could not be loaded. Check your connection and try again."));
          return;
        }

        if (!isMounted) return;
        setCurrentUser(user);
        setTodayAttendance(existingAttendance as DailyAttendance | null);
        if (storedTemplate && Array.isArray(storedTemplate.descriptors)) {
          const loadedTemplate: FaceTemplate = {
            descriptors: storedTemplate.descriptors as number[][],
            createdAt: storedTemplate.enrolled_at,
            modelVersion: "InsightFace",
            embeddingModel: storedTemplate.embedding_model as FaceTemplate["embeddingModel"],
            samplePaths: Array.isArray(storedTemplate.sample_paths) ? storedTemplate.sample_paths as string[] : [],
          };
          templateRef.current = loadedTemplate;
          setTemplate(loadedTemplate);
        }
      } catch {
        if (isMounted) setErrorMessage(localized("Sesi login belum siap. Periksa koneksi Supabase lalu login kembali.", "The sign-in session is not ready. Check the Supabase connection and sign in again."));
      } finally {
        if (isMounted) setIsResolvingSession(false);
      }
    }

    void loadCurrentUser();
    return () => { isMounted = false; };
  }, [language, localized, router]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const localizedChallenges: Record<ChallengeId, { label: string; helper: string }> = language === "id" ? challengeDetails : { left: { label: "Face left", helper: "Turn your face slightly left." }, right: { label: "Face right", helper: "Turn your face slightly right." }, up: { label: "Look up", helper: "Lift your head slightly." }, down: { label: "Look down", helper: "Lower your head slightly." }, blink: { label: "Blink", helper: "Blink one eye once." } };
  const activePrompt = activeChallenge && scanState === "scanning" ? localizedChallenges[activeChallenge] : null;
  const attendanceReady = !isEnrollment && identityVerified && allChallengesCompleted && Boolean(template) && scanState === "scanning";
  const compactCamera = attendanceReady || isAttendanceRejected;
  const cameraDiameter = compactCamera ? "min(48vw, 24dvh, 215px)" : "min(82vw, 45dvh, 430px)";
  const hasClockedIn = Boolean(todayAttendance?.clock_in);
  const attendanceCompleted = Boolean(todayAttendance?.clock_out);
  const nextAttendanceAction = hasClockedIn && !attendanceCompleted ? "CLOCK_OUT" : "CLOCK_IN";
  const attendanceStatus = attendanceCompleted
    ? copy.statusComplete
    : hasClockedIn
      ? copy.statusWorking
      : copy.statusReady;

  const title = isEnrollment ? t("biometricRegistration") : t("faceBiometricAttendance");
  const scanStatusTone: BadgeTone = scanState === "scanning" ? "blue" : scanState === "error" ? "red" : scanState === "complete" ? "green" : "slate";
  // BUG-D3-023: the countdown turns red in the last five seconds.
  const isScanTimeLow = scanSecondsLeft !== null && scanSecondsLeft <= 5;

  return (
    <main className={`relative isolate h-[100dvh] overflow-hidden ${pageBgClass} text-slate-900`}>
      <style>{`
        @keyframes biometric-scan-sweep {
          0%, 100% { top: 10%; opacity: 0.35; }
          50% { top: 88%; opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .biometric-scan-line { animation: none !important; }
        }
      `}</style>
      <AppHeader pageTitle={title} />

      {isSavingTemplate && (
        <div className={modalClass.overlay} role="status" aria-live="polite">
          <div className={`${modalClass.panel} max-w-sm p-6 text-center`}>
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-blue-50 text-blue-600"><LoaderCircle size={24} className="animate-spin" /></div>
            <h2 className="mt-4 text-base font-bold text-slate-900">{copy.savingRegistration}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{savingStage || copy.processingSample}</p>
            <p className="mt-3 text-[11px] text-slate-500">{copy.doNotClose}</p>
          </div>
        </div>
      )}

      {/* The shared AppHeader is 58px tall; the workspace fills the rest of the viewport. */}
      <div className="relative z-10 mx-auto flex h-[calc(100dvh-58px)] max-w-[1440px] min-h-0 flex-col px-3 py-3 sm:px-5 sm:py-4 lg:px-7">
        <section className="shrink-0">
          {isEnrollment ? (
            <div className={`${cardClass} mx-auto flex max-w-3xl items-center justify-center gap-3 px-5 py-3 text-center`}>
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Eye size={18} /></div>
              <div><p className="text-sm font-bold text-slate-900">{copy.registration}</p><p className="mt-0.5 text-[11px] font-medium text-slate-500">{copy.registrationHelp}</p></div>
            </div>
          ) : <RealtimeAttendanceClock frozenAt={attendanceReady ? verificationLockedAt : null} />}
        </section>

        {actionMessage && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{actionMessage}</div>
        )}
        {errorMessage && !isAttendanceRejected && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"><CircleAlert size={17} className="mt-0.5 shrink-0" />{errorMessage}</div>
        )}

        <div className="mx-auto mt-3 w-full max-w-[1440px]">
          <section className={`${cardClass} flex w-full flex-col overflow-hidden`}>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div><p className={pageTitleClass.eyebrow}>{copy.liveIdentity}</p><h3 className="mt-0.5 text-sm font-bold text-slate-900">{copy.camera}</h3></div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className={badgeClass(scanStatusTone, "tracking-[0.04em]")}>{scanState === "scanning" ? copy.scanning : scanState === "loading" ? copy.preparing : scanState === "complete" ? copy.complete : isScanTimedOut ? copy.timedOut : copy.ready}</span>
                {/* BUG-D3-023: a large countdown (registration 90 s, attendance 60 s) that turns red at 5 s or less. */}
                {scanSecondsLeft !== null && <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 ring-1 ring-inset transition-colors ${isScanTimeLow ? "bg-red-50 text-[#DC2626] ring-red-200" : "bg-blue-50 text-[#3B6FF5] ring-blue-200"}`}><Clock3 size={18} aria-hidden="true" className="shrink-0" /><span aria-hidden="true" className="text-2xl font-bold leading-8 tabular-nums">{Math.floor(scanSecondsLeft / 60)}:{String(scanSecondsLeft % 60).padStart(2, "0")}</span><span className="sr-only">{copy.timeLeft(scanSecondsLeft)}</span></span>}
              </div>
            </div>

            <div className={`relative mx-auto shrink-0 transition-all duration-500 ${compactCamera ? "p-3 sm:p-4" : "p-5 sm:p-7"}`} style={{ width: cameraDiameter, height: cameraDiameter, flex: "0 0 auto" }}>
              <div className={`absolute inset-3 rounded-full border shadow-[0_0_44px_rgba(27,53,102,0.18)] ${isAttendanceRejected ? "border-red-400/35" : "border-[#307ee7]/25"}`} />
              <div className={`absolute inset-7 rounded-full border ${isAttendanceRejected ? "border-red-300/60" : "border-[#65b5ff]/55"}`} />
              <div className={`relative size-full overflow-hidden rounded-full border-2 shadow-[0_0_0_10px_rgba(36,113,213,0.08),0_0_50px_rgba(29,115,227,0.25)] ${isAttendanceRejected ? "border-red-300/70 bg-[#260912]" : "border-[#7fc6ff]/80 bg-[#071225]"}`}>
              <video ref={videoRef} muted playsInline className={`size-full origin-center scale-x-[-1] object-cover transition duration-500 ${scanState === "scanning" ? "opacity-100" : "opacity-25"}`} />
              {isAttendanceRejected ? (
                <div className="absolute inset-0 grid place-items-center p-6 text-center text-red-100"><div><div className="mx-auto grid size-14 place-items-center rounded-full border border-red-200/30 bg-red-500/20"><CircleAlert size={27} /></div><p className="mt-3 text-xs font-bold tracking-[0.08em]">{copy.faceRejected}</p></div></div>
              ) : scanState !== "scanning" && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center text-slate-100">
                  <div><div className="mx-auto grid size-14 place-items-center rounded-full border border-white/20 bg-white/10"><Video size={25} /></div><p className="mt-3 text-sm font-bold">{copy.cameraInactive}</p><p className="mt-1 text-xs text-slate-300">{copy.cameraHelp}</p></div>
                </div>
              )}
              {scanState === "scanning" && <>
                <div className="pointer-events-none absolute inset-[9%] rounded-full border-2 border-[#73c0ff] shadow-[0_0_22px_rgba(71,166,255,0.85)]" />
                {faceMesh.length > 0 && <svg className="pointer-events-none absolute inset-0 size-full origin-center scale-x-[-1]" viewBox={`0 0 ${videoDimensions.width} ${videoDimensions.height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <g fill="none" stroke="#8ee7ff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
                    {FACE_OVERLAY_PATHS.map((path, index) => {
                      const points = path.map((pointIndex) => faceMesh[pointIndex]).filter((point): point is FaceMeshPoint => Boolean(point));
                      return points.length > 1 ? <polyline key={index} points={points.map((point) => `${point.x},${point.y}`).join(" ")} /> : null;
                    })}
                  </g>
                  <g fill="#d6f7ff" opacity="0.82">
                    {faceMesh.filter((_, index) => index % 6 === 0).map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="1.3" />)}
                  </g>
                </svg>}
                <div className="biometric-scan-line pointer-events-none absolute inset-x-[14%] h-px bg-[#c4ecff] shadow-[0_0_18px_4px_rgba(83,184,255,0.85)]" style={{ animation: "biometric-scan-sweep 2.15s ease-in-out infinite" }} />
                {activePrompt && <div className="pointer-events-none absolute inset-x-[18%] top-3 rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-center text-white shadow-lg"><p className="text-[9px] font-bold uppercase tracking-[0.1em] text-blue-200">{copy.liveness} {completedChallenges.length + 1}/{challengeOrder.length}</p><p className="mt-0.5 text-xs font-bold">{activePrompt.label}</p><p className="mt-0.5 text-[10px] leading-3 text-slate-200">{activePrompt.helper}</p></div>}
                {isEnrollment && allChallengesCompleted && !isSavingTemplate && <div className="pointer-events-none absolute left-1/2 top-4 w-[62%] -translate-x-1/2 rounded-lg border border-white/15 bg-slate-900/80 px-3 py-1.5 text-center text-[10px] font-bold leading-4 text-white shadow-lg">{copy.recordingSample} {faceSampleCount}/{REQUIRED_FACE_SAMPLES} · {copy.stayStill}</div>}
                {!isEnrollment && allChallengesCompleted && !identityVerified && <div className="pointer-events-none absolute left-1/2 top-4 max-w-[calc(100%-2rem)] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-slate-900/80 px-3 py-1.5 text-center text-[10px] font-bold text-white shadow-lg">{copy.verifying}</div>}
                {attendanceReady && <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600/90 px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-white">{copy.faceVerified}</div>}
                {!attendanceReady && !activePrompt && <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/75 px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-slate-100">{copy.faceLock}</div>}
              </>}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
              {isAttendanceRejected ? (
                <button type="button" onClick={() => void startScan()} className={buttonClass("danger", "md", "min-h-11")}><Video size={16} /> {copy.retry}</button>
              ) : scanState === "loading" || isResolvingSession ? (
                <button disabled className={buttonClass("primary", "md", "min-h-11")}><LoaderCircle size={16} className="animate-spin" /> {copy.preparingCamera}</button>
              ) : scanState === "scanning" ? (
                <button type="button" onClick={resetScan} className={buttonClass("dangerOutline", "md", "min-h-11")}><VideoOff size={16} /> {copy.cancelScan}</button>
              ) : (
                <button type="button" onClick={() => void startScan()} className={buttonClass("primary", "md", "min-h-11")}><Video size={16} /> {scanState === "complete" ? copy.startNewScan : isScanTimedOut ? copy.retry : copy.startCamera}</button>
              )}
              {!isEnrollment && !template && <Link href="/biometric-enrollment" className="text-xs font-semibold text-blue-700 hover:underline">{copy.noTemplate}</Link>}
            </div>

            {attendanceReady && <section className="mx-4 mb-3 shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-2.5 shadow-xs sm:mx-5 sm:p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-emerald-600 text-white"><CheckCircle2 size={15} /></span><div><p className="text-xs font-bold text-emerald-900">{copy.verifiedFace}</p><p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-700">{copy.identityLockActive}</p></div></div>
                <span className={badgeClass("green")}>{attendanceStatus}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5"><div className="flex items-center gap-1.5 text-slate-500"><UserRound size={13} /><p className="text-[10px] font-semibold uppercase tracking-[0.06em]">{copy.employee}</p></div><p className="mt-0.5 truncate text-xs font-bold text-slate-900">{currentUser?.fullName ?? <SkeletonBlock className="mt-1 h-3 w-24" />}</p><p className="mt-0.5 text-[10px] tabular-nums text-slate-500">ID · {currentUser?.employeeCode ?? "—"}</p></div>
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5"><div className="flex items-center gap-1.5 text-slate-500"><Clock3 size={13} /><p className="text-[10px] font-semibold uppercase tracking-[0.06em]">{copy.attendanceTime}</p></div><p className="mt-0.5 text-xs font-bold text-slate-900">{hasClockedIn ? `Clock-in · ${formatJakartaTime(todayAttendance!.clock_in, language)} WIB` : copy.waitingClockIn}</p>{hasClockedIn && attendanceCompleted ? <p className="mt-0.5 text-[10px] text-slate-500">Clock-out · {formatJakartaTime(todayAttendance!.clock_out!, language)} WIB</p> : <RealtimeAttendanceClock variant="inline" frozenAt={verificationLockedAt} />}</div>
                <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5"><div className="flex items-center gap-1.5 text-slate-500"><MapPin size={13} /><p className="text-[10px] font-semibold uppercase tracking-[0.06em]">{copy.location}</p></div><p className="mt-0.5 text-xs font-bold text-slate-900">{copy.gpsReady}</p><p className="mt-0.5 text-[10px] leading-3 text-slate-500">{copy.locationRecorded}</p></div>
              </div>
              <div className="mt-2 flex flex-col gap-2 border-t border-emerald-200 pt-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] text-emerald-800">{attendanceCompleted ? copy.dayComplete : copy.continueToRecord}</p><button type="button" disabled={isRecordingAttendance || attendanceCompleted} onClick={() => void recordAttendance()} className={buttonClass("success", "md", "min-h-10 shrink-0")}>{isRecordingAttendance ? <LoaderCircle size={16} className="animate-spin" /> : <Clock3 size={16} />}{isRecordingAttendance ? copy.readingLocation : attendanceCompleted ? copy.attendanceComplete : nextAttendanceAction === "CLOCK_OUT" ? copy.clockOutNow : copy.clockInNow}</button></div>
            </section>}
            {isAttendanceRejected && <div className="mx-4 mb-3 flex shrink-0 flex-col justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 sm:mx-5 sm:flex-row sm:items-center"><div><p className="text-xs font-bold text-red-800">{copy.faceRejected}</p><p className="mt-0.5 text-[11px] text-red-700">{copy.rejectionHelp}</p></div><button type="button" onClick={() => void startScan()} className={buttonClass("danger", "md", "shrink-0")}><Video size={16} /> {copy.retry}</button></div>}
          </section>
        </div>
      </div>
    </main>
  );
}
