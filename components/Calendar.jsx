"use client";
import {
  addOrUpdateCycleAction,
  getCyclesAction,
  getPredictedCyclesAction,
} from "@/lib/actions/cycles";
import { formatDate } from "@/lib/utils";
import { useState, useEffect } from "react";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [symptoms, setSymptoms] = useState([]);
  const [mood, setMood] = useState("");
  const [flow, setFlow] = useState(0);
  const [notes, setNotes] = useState("");
  const [cycleData, setCycleData] = useState({});
  const [predictionData, setPredictionData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const symptomOptions = [
    { id: "cramps", label: "Cramps", icon: "sentiment_stressed" },
    { id: "headache", label: "Headache", icon: "sick" },
    { id: "bloating", label: "Bloating", icon: "grain" },
    { id: "fatigue", label: "Fatigue", icon: "battery_very_low" },
  ];

  const moodOptions = [
    { id: "happy", label: "Happy", emoji: "😊" },
    { id: "sad", label: "Sad", emoji: "😥" },
    { id: "irritable", label: "Irritable", emoji: "😠" },
    { id: "energetic", label: "Energetic", emoji: "⚡" },
  ];

  const flowOptions = [
    { label: "None", value: 0 },
    { label: "Light", value: 1 },
    { label: "Medium", value: 2 },
    { label: "Heavy", value: 3 },
  ];

  // Fungsi untuk mengambil data cycles dari Supabase
  const fetchCycles = async () => {
    setIsLoading(true);

    const result = await getCyclesAction();
    if (result.errors) {
      console.error("Error loading cycles:", result.errors);
    } else {
      const formattedData = {};
      result.cycles.forEach((cycle) => {
        formattedData[cycle.date] = {
          symptoms: cycle.symptoms,
          mood: cycle.mood,
          flow: cycle.flow,
          notes: cycle.notes,
        };
      });
      setCycleData(formattedData);
    }

    const predictionResult = await getPredictedCyclesAction();
    if (predictionResult.errors) {
      console.error("Error loading predictions:", predictionResult.errors);
    } else {
      setPredictionData(predictionResult.predictions);
    }

    setIsLoading(false);
  };

  // Fungsi untuk menyimpan log ke Supabase
  const saveLog = async () => {
    const dateKey = formatDate(selectedDate);

    const formCycleData = new FormData();
    formCycleData.append("date", dateKey);
    formCycleData.append("flow", flow);
    formCycleData.append("mood", mood);
    symptoms.forEach((symptom) => formCycleData.append("symptoms", symptom));
    formCycleData.append("notes", notes);

    const result = await addOrUpdateCycleAction(formCycleData);

    if (result.errors) {
      console.error("Error saving cycle data:", result.errors);
    }

    fetchCycles();
  };

  // 🔥 USE EFFECT 1: Load data dari localStorage/Supabase saat komponen mount
  useEffect(() => {
    const loadData = async () => {
      await fetchCycles();
    };
    loadData();
  }, []);

  // 🔥 USE EFFECT 2: Load log data untuk selectedDate ketika berubah
  useEffect(() => {
    const loadLogForSelectedDate = () => {
      if (cycleData[formatDate(selectedDate)]) {
        const logData = cycleData[formatDate(selectedDate)];
        setSymptoms(logData.symptoms || []);
        setMood(logData.mood || "");
        setFlow(logData.flow || 0);
        setNotes(logData.notes || "");
      } else {
        // Reset ke default jika tidak ada data
        setSymptoms([]);
        setMood("");
        setFlow(0);
        setNotes("");
      }
    };
    loadLogForSelectedDate();
  }, [selectedDate, cycleData]);

  // Fungsi untuk handle update log
  function handleUpdateLog() {
    saveLog();
    console.log("Log updated for:", selectedDate.toDateString(), {
      symptoms,
      mood,
      flow,
      notes,
    });
    alert("Log updated successfully!");
  }

  // Fungsi navigasi bulan
  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  // Fungsi generate calendar days
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = new Date(firstDay);
    startDay.setDate(startDay.getDate() - firstDay.getDay());

    const days = [];
    const today = new Date();

    for (let i = 0; i < 42; i++) {
      const currentDay = new Date(startDay);
      currentDay.setDate(startDay.getDate() + i);

      const isCurrentMonth = currentDay.getMonth() === month;
      const isToday = currentDay.toDateString() === today.toDateString();
      const isSelected =
        currentDay.toDateString() === selectedDate.toDateString();
      const dateKey = formatDate(currentDay);

      // Cek data yang tersimpan untuk hari ini
      const hasLogData = cycleData[dateKey];

      // Logic untuk menentukan type hari berdasarkan data siklus
      let type = null;
      let ovulation = false;

      // Contoh logic - bisa diganti dengan prediksi siklus yang sebenarnya
      if (isToday) {
        // Jika hari ini
        type = "today";
      } else if (hasLogData && hasLogData.flow > 0) {
        // Jika ada flow pada hari tersebut (data user)
        type = "period";
      } else if (predictionData?.predictions) {
        // Hasil prediksi
        for (const prediction of predictionData.predictions) {
          // Period
          if (
            dateKey >= prediction.period.start &&
            dateKey <= prediction.period.end
          ) {
            type = "period";
            break;
          }

          // Fertile Window
          if (
            dateKey >= prediction.fertileWindow.start &&
            dateKey <= prediction.fertileWindow.end
          ) {
            type = "fertile";
            if (dateKey === prediction.ovulation) {
              // Jika hari ovulation
              ovulation = true;
            }
          }
        }
      }

      days.push({
        date: new Date(currentDay),
        day: currentDay.getDate(),
        type,
        ovulation,
        isCurrentMonth,
        isToday,
        isSelected,
        hasLogData,
      });
    }

    return days;
  };

  const getDayClass = (day) => {
    if (day.isSelected && day.type !== "today") {
      return "bg-primary/20 text-primary border-2 border-primary";
    }

    switch (day.type) {
      case "period":
        return "bg-period text-white";
      case "fertile":
        return "bg-fertile/30 text-text-light";
      case "today":
        return "bg-primary text-white ring-2 ring-primary";
      default:
        return day.isCurrentMonth
          ? "text-text-light hover:bg-gray-50"
          : "text-gray-300";
    }
  };

  function toggleSymptom(symptomId) {
    if (symptoms.includes(symptomId)) {
      setSymptoms(symptoms.filter((s) => s !== symptomId));
    } else {
      setSymptoms([...symptoms, symptomId]);
    }
  }

  const calendarDays = getCalendarDays();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap justify-between gap-4 items-center mb-8">
        <p className="text-text-light text-3xl font-bold leading-tight tracking-[-0.033em] min-w-72">
          Cycle Calendar
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Calendar Section */}
        <div className="xl:col-span-2 bg-card-light p-4 sm:p-6 rounded-lg shadow-sm border border-border-light">
          <div className="flex min-w-72 w-full flex-col gap-2">
            {/* Calendar Header */}
            <div className="flex items-center p-1 justify-between">
              <button
                onClick={prevMonth}
                className="flex size-10 items-center justify-center rounded-full text-text-muted-light hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-lg text-text-light">
                  chevron_left
                </span>
              </button>

              <div className="flex items-center gap-4">
                <select
                  value={currentDate.getMonth()}
                  onChange={(e) =>
                    setCurrentDate(
                      new Date(
                        currentDate.getFullYear(),
                        parseInt(e.target.value),
                        1
                      )
                    )
                  }
                  className="text-text-light text-lg font-bold leading-tight bg-transparent border-none focus:outline-none"
                >
                  {monthNames.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>

                <select
                  value={currentDate.getFullYear()}
                  onChange={(e) =>
                    setCurrentDate(
                      new Date(
                        parseInt(e.target.value),
                        currentDate.getMonth(),
                        1
                      )
                    )
                  }
                  className="text-text-light text-lg font-bold leading-tight bg-transparent border-none focus:outline-none"
                >
                  {Array.from(
                    { length: 10 },
                    (_, i) => new Date().getFullYear() - 5 + i
                  ).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={nextMonth}
                className="flex size-10 items-center justify-center rounded-full text-text-muted-light hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-lg text-text-light">
                  chevron_right
                </span>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 text-center">
              {/* Week Days */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <p
                  key={day}
                  className="text-text-muted-light text-xs font-bold leading-normal tracking-[0.015em] flex h-10 w-full items-center justify-center"
                >
                  {day}
                </p>
              ))}

              {/* Calendar Days */}
              {calendarDays.map((dayInfo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedDate(dayInfo.date)}
                  className={`h-14 w-full text-sm font-medium leading-normal relative transition-all ${getDayClass(
                    dayInfo
                  )}`}
                >
                  <div className="flex size-full items-center justify-center rounded-lg flex-col">
                    <span>{dayInfo.day}</span>
                    {dayInfo.ovulation && (
                      <div className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-ovulation"></div>
                    )}
                    {dayInfo.hasLogData && (
                      <div className="absolute top-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></div>
                    )}
                    {!dayInfo.isCurrentMonth && (
                      <span className="text-xs text-gray-400">
                        {dayInfo.date.getMonth() + 1}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 border-t border-border-light pt-4 flex flex-wrap gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-period"></div>
                <span className="text-xs font-medium text-text-muted-light">
                  Period
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-fertile/50"></div>
                <span className="text-xs font-medium text-text-muted-light">
                  Fertile Window
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-ovulation"></div>
                <span className="text-xs font-medium text-text-muted-light">
                  Ovulation
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-xs font-medium text-text-muted-light">
                  Has Log
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Log Section */}
        <div className="xl:col-span-1 bg-card-light p-4 sm:p-6 rounded-lg shadow-sm border border-border-light self-start">
          <div className="flex flex-col gap-6">
            <h3 className="text-text-light text-lg font-bold leading-tight tracking-[-0.015em]">
              Log for{" "}
              {selectedDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>

            {/* Symptoms */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-text-light">
                Symptoms
              </label>
              <div className="flex flex-wrap gap-2">
                {symptomOptions.map((symptom) => (
                  <button
                    key={symptom.id}
                    onClick={() => toggleSymptom(symptom.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      symptoms.includes(symptom.id)
                        ? "bg-primary text-white"
                        : "border border-border-light hover:bg-slate-100 bg-card-light text-text-muted-light"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {symptom.icon}
                    </span>
                    {symptom.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-text-light">Mood</label>
              <div className="flex flex-wrap gap-2">
                {moodOptions.map((moodOption) => (
                  <button
                    key={moodOption.id}
                    onClick={() => setMood(moodOption.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      mood === moodOption.id
                        ? "bg-primary text-white"
                        : "border border-border-light hover:bg-slate-100 bg-card-light text-text-muted-light"
                    }`}
                  >
                    {moodOption.emoji} {moodOption.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Flow */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-text-light">Flow</label>
              <div className="grid grid-cols-3 gap-2">
                {flowOptions.map((flowOption) => (
                  <button
                    key={flowOption.label}
                    onClick={() => setFlow(flowOption.value)}
                    className={`flex items-center justify-center rounded-lg px-4 py-1.5 text-sm transition-colors ${
                      flow === flowOption.value
                        ? "bg-primary text-white"
                        : "border border-border-light hover:bg-slate-100 bg-card-light text-text-muted-light"
                    }`}
                  >
                    {flowOption.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-bold text-text-light"
                htmlFor="notes"
              >
                Notes
              </label>
              <textarea
                className="w-full rounded-lg border border-border-light bg-background-light text-text-light placeholder:text-text-muted-light focus:ring-primary focus:border-primary p-3"
                id="notes"
                placeholder="Add any extra details here..."
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

            {/* Update Button */}
            <button
              onClick={handleUpdateLog}
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 bg-primary text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
            >
              Update Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
