# NodeWatch Resource Monitor

NodeWatch is a polished, containerized Flask dashboard for monitoring live host/container resources. It keeps the project intentionally small and readable while demonstrating practical backend API design, frontend updates without page reloads, Docker packaging, and system observability with `psutil`.

## Features

- Live CPU usage and per-core CPU breakdown
- Memory usage with used/total values
- Disk usage with used/total values
- Network I/O totals and current transfer rates
- Hostname, operating system, Python version, and uptime
- App uptime
- Top processes by CPU and memory usage
- Health indicator based on CPU, memory, and disk pressure
- Rolling live history chart for CPU, memory, and disk
- Frontend refreshes from JSON without reloading the page
- Docker-ready for local use or deployment platforms

## Architecture

```text
resource-monitor/
├── app.py                 # Flask app, page route, and /api/metrics endpoint
├── requirements.txt       # Python dependencies
├── Dockerfile             # Container image definition
├── .dockerignore          # Keeps image build context clean
├── templates/
│   └── index.html         # Dashboard HTML
├── static/
│   ├── style.css          # Professional dark UI styling
│   └── app.js             # Dynamic frontend + live chart
└── .gitignore
```

The browser loads `templates/index.html` once. JavaScript in `static/app.js` calls `/api/metrics` every two seconds, receives JSON from Flask, and updates the dashboard in place.

```text
Browser UI
   ↓ fetch every 2s
/api/metrics
   ↓
Flask + psutil
   ↓
Host/container CPU, memory, disk, network, process, and system metrics
```

## Run Locally With Python

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open:

```text
http://localhost:8080
```

## Run With Docker

Build the image:

```bash
docker build -t nodewatch-resource-monitor .
```

Run the container:

```bash
docker run --rm -p 8080:8080 --name resource-monitor nodewatch-resource-monitor
```

Open:

```text
http://localhost:8080
```

The Docker container runs the Flask app behind Gunicorn, while `python app.py` remains available for simple local development.

## API

### `GET /api/metrics`

Returns live resource metrics as JSON:

```json
{
  "cpu": {
    "percent": 12.4,
    "cores": [4.2, 18.1],
    "physical_cores": 4,
    "logical_cores": 8
  },
  "memory": {
    "total_gb": 7.72,
    "used_gb": 3.81,
    "percent": 49.3
  },
  "disk": {
    "total_gb": 120.0,
    "used_gb": 44.2,
    "percent": 36.8
  },
  "network": {
    "received_kbps": 2.4,
    "sent_kbps": 1.1
  },
  "health": {
    "label": "Healthy",
    "state": "healthy"
  }
}
```

## Screenshots

Add screenshots here after running the app locally or after deployment.

```text
screenshots/
└── dashboard.png
```

## Deployment Notes

This app can be deployed as a containerized web service on platforms such as Render, Railway, Fly.io, or any Linux server that supports Docker.

Important: once deployed, the dashboard shows metrics for the deployed server or container, not for each visitor's personal computer. That makes this project best described as a server/container resource monitoring dashboard.

## Portfolio Summary

A concise portfolio description:

> Built a containerized Linux resource monitoring dashboard with Python, Flask, psutil, Docker, Gunicorn, and a dynamic JavaScript frontend. The app exposes a JSON metrics API and visualizes live CPU, memory, disk, network, uptime, host health, and process data without full page reloads.
