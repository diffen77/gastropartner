FROM python:3.11-slim

WORKDIR /app

# Installera build dependencies för psutil
RUN apt-get update && \
    apt-get install -y gcc python3-dev && \
    rm -rf /var/lib/apt/lists/*

# Installera Python dependencies
RUN pip install requests psutil

COPY monitor.py /app/

CMD ["python", "monitor.py"]
