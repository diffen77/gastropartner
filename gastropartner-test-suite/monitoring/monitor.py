#!/usr/bin/env python3
"""
Enkel performance monitor för GastroPartner test suite.
Övervakar system resources och test performance.
"""

import time
import json
import os
from datetime import datetime
import requests
import psutil

def get_system_stats():
    """Hämta system statistik."""
    return {
        'timestamp': datetime.now().isoformat(),
        'cpu_percent': psutil.cpu_percent(interval=1),
        'memory_percent': psutil.virtual_memory().percent,
        'disk_percent': psutil.disk_usage('/').percent,
        'network_io': psutil.net_io_counters()._asdict() if psutil.net_io_counters() else {}
    }

def check_services():
    """Kontrollera om test-relaterade tjänster fungerar."""
    services = {
        'frontend': 'http://192.168.99.70:3000',
        'backend': 'http://192.168.99.70:8000/health'
    }
    
    results = {}
    for name, url in services.items():
        try:
            response = requests.get(url, timeout=5)
            results[name] = {
                'status': 'up',
                'response_time': response.elapsed.total_seconds(),
                'status_code': response.status_code
            }
        except Exception as e:
            results[name] = {
                'status': 'down',
                'error': str(e)
            }
    
    return results

def save_metrics(data):
    """Spara metrics till fil."""
    os.makedirs('/app/reports', exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'/app/reports/monitoring_{timestamp}.json'
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    # Spara senaste också
    with open('/app/reports/latest_monitoring.json', 'w') as f:
        json.dump(data, f, indent=2)

def main():
    """Huvudloop för monitoring."""
    interval = int(os.environ.get('MONITOR_INTERVAL', 300))  # 5 minuter default
    
    print(f"Startar monitoring med {interval}s intervall...")
    
    while True:
        try:
            system_stats = get_system_stats()
            service_stats = check_services()
            
            data = {
                'system': system_stats,
                'services': service_stats,
                'monitor_interval': interval
            }
            
            save_metrics(data)
            
            print(f"Metrics sparade: CPU {system_stats['cpu_percent']}%, "
                  f"RAM {system_stats['memory_percent']}%")
            
        except Exception as e:
            print(f"Monitoring fel: {e}")
        
        time.sleep(interval)

if __name__ == '__main__':
    main()
