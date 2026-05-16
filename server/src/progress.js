export const quarters = ["Q1", "Q2", "Q3", "Q4"];

export function computeProgress(uomType, target, actual) {
  if (actual === undefined || actual === null || actual === "") {
    return { scorePercent: null, scoreLabel: "Pending" };
  }

  if (uomType === "Timeline") {
    const completion = new Date(actual);
    const deadline = new Date(target);

    if (Number.isNaN(completion.getTime()) || Number.isNaN(deadline.getTime())) {
      return { scorePercent: null, scoreLabel: "Invalid date" };
    }

    if (completion.getTime() < deadline.getTime()) {
      return { scorePercent: 100, scoreLabel: "Early" };
    }

    if (completion.toISOString().slice(0, 10) === deadline.toISOString().slice(0, 10)) {
      return { scorePercent: 100, scoreLabel: "On Time" };
    }

    return { scorePercent: 40, scoreLabel: "Delayed" };
  }

  const numericTarget = Number(target);
  const numericActual = Number(actual);

  if (!Number.isFinite(numericTarget) || !Number.isFinite(numericActual)) {
    return { scorePercent: null, scoreLabel: "Invalid number" };
  }

  if (uomType === "Zero") {
    const scorePercent = numericActual === 0 ? 100 : 0;
    return { scorePercent, scoreLabel: `${scorePercent}%` };
  }

  if (numericTarget <= 0 || numericActual < 0) {
    return { scorePercent: null, scoreLabel: "Invalid value" };
  }

  if (uomType === "Max" && numericActual === 0) {
    return { scorePercent: 100, scoreLabel: "100%" };
  }

  const ratio = uomType === "Max" ? numericTarget / numericActual : numericActual / numericTarget;
  const scorePercent = Math.max(0, Math.round(ratio * 100));

  return { scorePercent, scoreLabel: `${scorePercent}%` };
}

export function scoreBand(scorePercent) {
  if (scorePercent === null || scorePercent === undefined) return "neutral";
  if (scorePercent >= 80) return "green";
  if (scorePercent >= 50) return "amber";
  return "red";
}

export function isQuarterOpenByCalendar(quarter, now = new Date()) {
  const month = now.getMonth() + 1;
  return (
    (quarter === "Q1" && month === 7) ||
    (quarter === "Q2" && month === 10) ||
    (quarter === "Q3" && month === 1) ||
    (quarter === "Q4" && (month === 3 || month === 4))
  );
}
