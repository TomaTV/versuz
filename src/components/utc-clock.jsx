"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback) {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

function getSnapshot() {
  return new Date().toUTCString().slice(17, 25);
}

function getServerSnapshot() {
  return "--:--:--";
}

export function UtcClock() {
  const time = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <span>{time} UTC · live</span>;
}
