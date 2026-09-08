import os
import platform
import socket
import time
from datetime import datetime, timezone

import psutil
from flask import Flask, jsonify, render_template

app = Flask(__name__)
STARTED_AT = time.time()
_LAST_NET = {"timestamp": time.time(), "bytes_sent": 0, "bytes_recv": 0}


def bytes_to_mb(value):
    return round(value / (1024 * 1024), 2)


def format_duration(seconds):
    seconds = int(seconds)
    days, remainder = divmod(seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, seconds = divmod(remainder, 60)

    if days:
        return f"{days}d {hours:02d}h {minutes:02d}m"
    return f"{hours:02d}h {minutes:02d}m {seconds:02d}s"


def disk_usage():
    path = os.getenv("MONITOR_DISK_PATH", "/")
    if os.name == "nt":
        path = os.getenv("MONITOR_DISK_PATH", "C:\\\\")
    try:
        usage = psutil.disk_usage(path)
    except (FileNotFoundError, PermissionError):
        usage = psutil.disk_usage("/")
    return {
        "path": path,
        "total_gb": round(usage.total / (1024 ** 3), 2),
        "used_gb": round(usage.used / (1024 ** 3), 2),
        "free_gb": round(usage.free / (1024 ** 3), 2),
        "percent": usage.percent,
    }


def network_rates():
    global _LAST_NET

    counters = psutil.net_io_counters()
    now = time.time()
    elapsed = max(now - _LAST_NET["timestamp"], 0.001)

    sent_rate = (counters.bytes_sent - _LAST_NET["bytes_sent"]) / elapsed
    recv_rate = (counters.bytes_recv - _LAST_NET["bytes_recv"]) / elapsed

    _LAST_NET = {
        "timestamp": now,
        "bytes_sent": counters.bytes_sent,
        "bytes_recv": counters.bytes_recv,
    }

    return {
        "sent_mb": bytes_to_mb(counters.bytes_sent),
        "received_mb": bytes_to_mb(counters.bytes_recv),
        "sent_kbps": round(sent_rate / 1024, 2),
        "received_kbps": round(recv_rate / 1024, 2),
    }


def top_processes(limit=6):
    processes = []
    for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_info"]):
        try:
            info = proc.info
            memory = info.get("memory_info")
            processes.append(
                {
                    "pid": info.get("pid"),
                    "name": info.get("name") or "unknown",
                    "cpu_percent": round(info.get("cpu_percent") or 0, 1),
                    "memory_mb": bytes_to_mb(memory.rss) if memory else 0,
                }
            )
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    return sorted(
        processes,
        key=lambda item: (item["cpu_percent"], item["memory_mb"]),
        reverse=True,
    )[:limit]


def health_status(cpu_percent, memory_percent, disk_percent):
    highest = max(cpu_percent, memory_percent, disk_percent)
    if highest >= 90:
        return {"label": "Critical", "state": "critical"}
    if highest >= 75:
        return {"label": "Watch", "state": "warning"}
    return {"label": "Healthy", "state": "healthy"}


@app.route("/")
def dashboard():
    return render_template("index.html")


@app.route("/api/metrics")
def metrics():
    cpu_percent = psutil.cpu_percent(interval=0.2)
    per_core = psutil.cpu_percent(interval=None, percpu=True)
    memory = psutil.virtual_memory()
    disk = disk_usage()
    boot_time = psutil.boot_time()

    data = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cpu": {
            "percent": cpu_percent,
            "cores": [round(value, 1) for value in per_core],
            "physical_cores": psutil.cpu_count(logical=False),
            "logical_cores": psutil.cpu_count(logical=True),
            "load_average": os.getloadavg() if hasattr(os, "getloadavg") else None,
        },
        "memory": {
            "total_gb": round(memory.total / (1024 ** 3), 2),
            "available_gb": round(memory.available / (1024 ** 3), 2),
            "used_gb": round(memory.used / (1024 ** 3), 2),
            "percent": memory.percent,
        },
        "disk": disk,
        "network": network_rates(),
        "system": {
            "hostname": socket.gethostname(),
            "os": platform.platform(),
            "python": platform.python_version(),
            "boot_time": datetime.fromtimestamp(boot_time, timezone.utc).isoformat(),
            "system_uptime": format_duration(time.time() - boot_time),
            "app_uptime": format_duration(time.time() - STARTED_AT),
        },
        "processes": top_processes(),
    }
    data["health"] = health_status(cpu_percent, memory.percent, disk["percent"])
    return jsonify(data)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")))

