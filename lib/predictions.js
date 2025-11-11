import { formatDate } from "./utils";

const dayToMs = 24 * 60 * 60 * 1000;

// Mengubah data cycle menjadi array periods
export function getCyclePeriods(cycles) {
  if (!cycles || cycles.length === 0) return [];

  cycles.sort((a, b) => new Date(a.date) - new Date(b.date));

  const periods = [];
  let start = null;
  let lastDate = null;
  const MAX_GAP = 3 * dayToMs; // 3 hari

  for (let i = 0; i < cycles.length; i++) {
    const curr = cycles[i];
    const currDate = new Date(curr.date);

    // Detect long gap
    const hasGap = lastDate && (currDate - lastDate) > MAX_GAP;

    // Menstruasi mulai
    if (curr.flow > 0 && !start) {
      start = curr.date;
    }

    // Menstruasi sedang berlangsung tapi ada gap, tutup periode
    if (hasGap && start) {
      periods.push({
        start,
        end: `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`,
        long: Math.ceil((lastDate - new Date(start)) / dayToMs) + 1,
      });
      start = null;
    }

    // Menstruasi berhenti
    if (curr.flow <= 0 && start && !hasGap) {
      periods.push({
        start,
        end: `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`,
        long: Math.ceil((lastDate - new Date(start)) / dayToMs) + 1,
      });
      start = null;
    }

    // Menstruasi sedang berlangsung dan gap, check apakah period dimulai lagi
    if (hasGap && curr.flow > 0) {
      start = curr.date;
    }

    lastDate = currDate;
  }

  // Jika loop selesai tapi periode belum ditutup
  if (start) {
    periods.push({
      start,
      end: `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`,
      long: Math.ceil((lastDate - new Date(start)) / dayToMs) + 1,
    });
  }

  return periods;
}

// Hitung rata-rata cycle dan period length
export function calculateMeanCycle(cycles) {
  const cyclePeriods = getCyclePeriods(cycles);

  // Jika tidak ada data period
  if (!cyclePeriods || cyclePeriods.length === 0) {
    return {
      meanCycleLength: 28,
      meanPeriodLength: 5,
      isUsingDefault: true,
      dataCount: 0
    };
  }

  // Jika hanya ada 1 data period
  if (cyclePeriods.length === 1) {
    const onlyPeriod = cyclePeriods[0];

    return {
      meanCycleLength: 28,
      meanPeriodLength: onlyPeriod.long || 5,
      isUsingDefault: true,
      dataCount: 1
    };
  }

  cyclePeriods.sort((a, b) => new Date(a.start) - new Date(b.start));

  const cycleLengths = [];
  for (let i = 1; i < cyclePeriods.length; i++) {
    const prev = new Date(cyclePeriods[i - 1].start);
    const curr = new Date(cyclePeriods[i].start);

    // Hitung selisih hari antara dua period
    const diff = Math.ceil((curr - prev) / dayToMs);

    if (diff >= 18 && diff <= 45) {
      cycleLengths.push(diff);
    }
  }

  // Jika tidak ada data cycle length valid
  if (cycleLengths.length === 0) {
    return {
      meanCycleLength: 28,
      meanPeriodLength: Math.round(
        cyclePeriods.reduce((a, b) => a + b.long, 0) / cyclePeriods.length
      ),
      isUsingDefault: true,
      dataCount: cyclePeriods.length
    };
  }

  // Hitung rata-rata cycle length dan period length
  const meanCycleLength = Math.round(
    cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
  );

  const meanPeriodLength = Math.round(
    cyclePeriods.reduce((a, b) => a + b.long, 0) / cyclePeriods.length
  );


  return {
    meanCycleLength,
    meanPeriodLength,
    isUsingDefault: false,
    dataCount: cyclePeriods.length
  };
}

// Memprediksi next period berdasarkan data cycles
export async function predictNextPeriod(cycles, lutealPhaseLength = 14) {
  const cyclePeriods = getCyclePeriods(cycles);
  const { meanCycleLength, meanPeriodLength, isUsingDefault, dataCount } = calculateMeanCycle(cycles);

  const today = new Date();

  if (!cyclePeriods || cyclePeriods.length === 0) {
    // fallback jika tidak ada data period
    let nextStart = new Date(today.getTime() + meanCycleLength * dayToMs);

    while (nextStart <= today) {
      nextStart = new Date(nextStart.getTime() + meanCycleLength * dayToMs);
    }

    const ovulation = new Date(nextStart.getTime() - lutealPhaseLength * dayToMs);

    return {
      meanCycleLength,
      meanPeriodLength,
      lutealPhaseLength,
      isUsingDefault,
      dataCount: 0,
      lastPeriod: null,
      nextPeriodStart: formatDate(nextStart),
      nextOvulation: formatDate(ovulation),
      nextFertileWindow: {
        start: formatDate(new Date(ovulation.getTime() - 4 * dayToMs)),
        end: formatDate(new Date(ovulation.getTime() + 1 * dayToMs))
      }
    };
  }

  cyclePeriods.sort((a, b) => new Date(a.start) - new Date(b.start));

  const lastPeriod = cyclePeriods[cyclePeriods.length - 1];
  const lastStart = new Date(lastPeriod.start);

  let nextStart = new Date(lastStart.getTime() + meanCycleLength * dayToMs);

  while (nextStart <= today) {
    nextStart = new Date(nextStart.getTime() + meanCycleLength * dayToMs);
  }

  const ovulation = new Date(nextStart.getTime() - lutealPhaseLength * dayToMs);

  return {
    meanCycleLength,
    meanPeriodLength,
    lutealPhaseLength,
    isUsingDefault,
    dataCount,
    lastPeriod,
    nextPeriod: {
      start: formatDate(nextStart),
      end: formatDate(new Date(nextStart.getTime() + (meanPeriodLength - 1) * dayToMs))
    },
    nextOvulation: formatDate(ovulation),
    nextFertileWindow: {
      start: formatDate(new Date(ovulation.getTime() - 4 * dayToMs)),
      end: formatDate(new Date(ovulation.getTime() + 1 * dayToMs))
    }
  };
}

// Membangun prediksi siklus berdasarkan start date dan rata-rata panjang siklus
function buildPredictedCycle(startDate, meanPeriodLength, lutealPhaseLength) {
  const start = new Date(startDate);
  const end = new Date(start.getTime() + (meanPeriodLength - 1) * dayToMs);

  const ovulation = new Date(start.getTime() - lutealPhaseLength * dayToMs);

  const fertileWindow = {
    start: formatDate(new Date(ovulation.getTime() - 4 * dayToMs)),
    end: formatDate(new Date(ovulation.getTime() + 1 * dayToMs))
  };

  return {
    period: {
      start: formatDate(start),
      end: formatDate(end)
    },
    ovulation: formatDate(ovulation),
    fertileWindow
  };
}

// Memprediksi future periods berdasarkan data cycles
export function predictFuturePeriods(cycles, lutealPhaseLength = 14, monthsAhead = 3) {
  const cyclePeriods = getCyclePeriods(cycles);
  const { meanCycleLength, meanPeriodLength, isUsingDefault, dataCount } = calculateMeanCycle(cycles);

  const today = new Date();
  const futureLimit = new Date();
  futureLimit.setMonth(futureLimit.getMonth() + monthsAhead); // default 3 bulan

  // Jika tidak ada data cycle
  if (!cyclePeriods || cyclePeriods.length === 0) {
    let predictions = [];

    // Tentukan siklus pertama berdasarkan hari ini
    let nextStart = new Date(today.getTime() + meanCycleLength * dayToMs);

    // Tambahkan siklus sebelumnya
    predictions.push(
      buildPredictedCycle(
        new Date(nextStart.getTime() - meanCycleLength * dayToMs),
        meanPeriodLength,
        lutealPhaseLength
      )
    );

    // Tambahkan siklus sampai 3 bulan ke depan
    while (nextStart <= futureLimit) {
      predictions.push(
        buildPredictedCycle(
          nextStart,
          meanPeriodLength,
          lutealPhaseLength
        )
      );
      nextStart = new Date(nextStart.getTime() + meanCycleLength * dayToMs);
    }

    return {
      predictions,
      meanCycleLength,
      meanPeriodLength,
      lutealPhaseLength,
      isUsingDefault,
      dataCount: 0,
      lastPeriod: null
    };
  }

  // Jika ada data cycle
  cyclePeriods.sort((a, b) => new Date(a.start) - new Date(b.start));
  const lastPeriod = cyclePeriods[cyclePeriods.length - 1];

  function getPredictedByIndex(index) {
    const startBase = new Date(
      new Date(lastPeriod.start).getTime() + index * meanCycleLength * dayToMs
    );
    return buildPredictedCycle(
      startBase,
      meanPeriodLength,
      lutealPhaseLength
    );
  }

  // Temukan index siklus yang tepat untuk sekarang
  let index = 1;
  let pred = getPredictedByIndex(index);

  while (new Date(pred.period.end) < today) {
    index++;
    pred = getPredictedByIndex(index);
  }

  // Kumpulkan prediksi siklus
  const predictions = [];

  // previous cycle
  predictions.push(getPredictedByIndex(index - 1));

  // current & future cycles
  let curIndex = index;
  let currentPrediction = getPredictedByIndex(curIndex);

  while (new Date(currentPrediction.period.start) <= futureLimit) {
    predictions.push(currentPrediction);
    curIndex++;
    currentPrediction = getPredictedByIndex(curIndex);
  }

  return {
    predictions,
    meanCycleLength,
    meanPeriodLength,
    lutealPhaseLength,
    isUsingDefault,
    dataCount,
    lastPeriod
  };
}
