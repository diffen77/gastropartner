"""Alerting and notification system for monitoring."""

import asyncio
import json
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel, Field

from gastropartner.config import get_settings

settings = get_settings()


class Alert(BaseModel):
    """Alert model."""
    
    id: str
    title: str
    description: str
    severity: str = Field(..., description="low, medium, high, critical")
    source: str = Field(..., description="Source system or service")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = Field(default_factory=dict)
    resolved: bool = False
    resolved_at: Optional[datetime] = None


class NotificationChannel(BaseModel):
    """Notification channel configuration."""
    
    type: str = Field(..., description="email, slack, pagerduty, webhook")
    config: Dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True
    severity_filter: List[str] = Field(default_factory=lambda: ["critical", "high"])


class AlertManager:
    """Centralized alert management system."""
    
    def __init__(self):
        self.active_alerts: Dict[str, Alert] = {}
        self.notification_channels: List[NotificationChannel] = []
        self._setup_default_channels()
    
    def _setup_default_channels(self):
        """Setup default notification channels based on configuration."""
        
        # Email notifications
        if settings.notification_email:
            self.notification_channels.append(
                NotificationChannel(
                    type="email",
                    config={
                        "to": settings.notification_email,
                        "smtp_server": "smtp.gmail.com",  # Default, should be configurable
                        "smtp_port": 587,
                        "use_tls": True
                    },
                    severity_filter=["critical", "high", "medium"]
                )
            )
        
        # Slack notifications
        if settings.slack_webhook_url:
            self.notification_channels.append(
                NotificationChannel(
                    type="slack",
                    config={
                        "webhook_url": settings.slack_webhook_url,
                        "channel": "#alerts"
                    },
                    severity_filter=["critical", "high"]
                )
            )
        
        # PagerDuty integration
        if settings.pagerduty_enabled and settings.pagerduty_integration_key:
            self.notification_channels.append(
                NotificationChannel(
                    type="pagerduty",
                    config={
                        "integration_key": settings.pagerduty_integration_key,
                        "service_id": settings.pagerduty_service_id
                    },
                    severity_filter=["critical"]
                )
            )
    
    async def create_alert(
        self,
        alert_id: str,
        title: str,
        description: str,
        severity: str = "medium",
        source: str = "system",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Alert:
        """Create a new alert."""
        
        alert = Alert(
            id=alert_id,
            title=title,
            description=description,
            severity=severity,
            source=source,
            metadata=metadata or {}
        )
        
        self.active_alerts[alert_id] = alert
        
        # Send notifications
        await self._send_notifications(alert)
        
        return alert
    
    async def resolve_alert(self, alert_id: str) -> Optional[Alert]:
        """Resolve an active alert."""
        
        if alert_id not in self.active_alerts:
            return None
        
        alert = self.active_alerts[alert_id]
        alert.resolved = True
        alert.resolved_at = datetime.now(timezone.utc)
        
        # Send resolution notifications
        await self._send_resolution_notifications(alert)
        
        # Remove from active alerts
        del self.active_alerts[alert_id]
        
        return alert
    
    async def _send_notifications(self, alert: Alert):
        """Send notifications for a new alert."""
        
        tasks = []
        
        for channel in self.notification_channels:
            if not channel.enabled:
                continue
            
            if alert.severity not in channel.severity_filter:
                continue
            
            if channel.type == "email":
                tasks.append(self._send_email_notification(alert, channel))
            elif channel.type == "slack":
                tasks.append(self._send_slack_notification(alert, channel))
            elif channel.type == "pagerduty":
                tasks.append(self._send_pagerduty_notification(alert, channel))
            elif channel.type == "webhook":
                tasks.append(self._send_webhook_notification(alert, channel))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _send_resolution_notifications(self, alert: Alert):
        """Send notifications when an alert is resolved."""
        
        tasks = []
        
        for channel in self.notification_channels:
            if not channel.enabled:
                continue
            
            if alert.severity not in channel.severity_filter:
                continue
            
            if channel.type == "email":
                tasks.append(self._send_email_resolution(alert, channel))
            elif channel.type == "slack":
                tasks.append(self._send_slack_resolution(alert, channel))
            elif channel.type == "pagerduty":
                tasks.append(self._send_pagerduty_resolution(alert, channel))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _send_email_notification(self, alert: Alert, channel: NotificationChannel):
        """Send email notification."""
        
        try:
            # Create email content
            subject = f"🚨 [{alert.severity.upper()}] {alert.title}"
            
            # HTML email body
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px;">
                <div style="background: {'#dc2626' if alert.severity == 'critical' else '#f59e0b' if alert.severity == 'high' else '#3b82f6'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0;">🚨 System Alert</h2>
                </div>
                <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
                    <h3 style="color: #1f2937; margin-top: 0;">{alert.title}</h3>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Severity:</td>
                            <td style="padding: 8px 0; color: #6b7280;">{alert.severity.upper()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Source:</td>
                            <td style="padding: 8px 0; color: #6b7280;">{alert.source}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Time:</td>
                            <td style="padding: 8px 0; color: #6b7280;">{alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Alert ID:</td>
                            <td style="padding: 8px 0; color: #6b7280; font-family: monospace;">{alert.id}</td>
                        </tr>
                    </table>
                    
                    <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid #3b82f6; border-radius: 4px;">
                        <h4 style="margin: 0 0 10px 0; color: #1f2937;">Description:</h4>
                        <p style="margin: 0; color: #374151; line-height: 1.6;">{alert.description}</p>
                    </div>
                    
                    {f'''
                    <div style="margin: 20px 0;">
                        <h4 style="color: #1f2937;">Additional Information:</h4>
                        <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">{json.dumps(alert.metadata, indent=2)}</pre>
                    </div>
                    ''' if alert.metadata else ''}
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            This is an automated alert from GastroPartner monitoring system.
                        </p>
                        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
                            Visit <a href="https://gastropartner.com/status">status page</a> for more information.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Plain text fallback
            text_body = f"""
GastroPartner System Alert

Title: {alert.title}
Severity: {alert.severity.upper()}
Source: {alert.source}
Time: {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}
Alert ID: {alert.id}

Description:
{alert.description}

{'Additional Information:' + json.dumps(alert.metadata, indent=2) if alert.metadata else ''}

This is an automated alert from GastroPartner monitoring system.
Visit https://gastropartner.com/status for more information.
            """
            
            # TODO: Implement actual email sending
            # For now, just log the email that would be sent
            print(f"📧 EMAIL ALERT: {subject}")
            print(f"   To: {channel.config['to']}")
            print(f"   Content: {alert.description}")
            
        except Exception as e:
            print(f"Failed to send email notification: {e}")
    
    async def _send_slack_notification(self, alert: Alert, channel: NotificationChannel):
        """Send Slack notification."""
        
        try:
            # Slack message format
            color = {
                "critical": "#dc2626",
                "high": "#ea580c",
                "medium": "#f59e0b",
                "low": "#22c55e"
            }.get(alert.severity, "#6b7280")
            
            emoji = {
                "critical": "🚨",
                "high": "⚠️",
                "medium": "🟡",
                "low": "🔵"
            }.get(alert.severity, "📋")
            
            payload = {
                "channel": channel.config.get("channel", "#alerts"),
                "username": "GastroPartner Monitoring",
                "icon_emoji": ":warning:",
                "attachments": [
                    {
                        "color": color,
                        "title": f"{emoji} {alert.title}",
                        "text": alert.description,
                        "fields": [
                            {
                                "title": "Severity",
                                "value": alert.severity.upper(),
                                "short": True
                            },
                            {
                                "title": "Source",
                                "value": alert.source,
                                "short": True
                            },
                            {
                                "title": "Time",
                                "value": alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC'),
                                "short": False
                            },
                            {
                                "title": "Alert ID",
                                "value": f"`{alert.id}`",
                                "short": False
                            }
                        ],
                        "footer": "GastroPartner Monitoring",
                        "ts": int(alert.timestamp.timestamp())
                    }
                ]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    channel.config["webhook_url"],
                    json=payload,
                    timeout=10.0
                )
                response.raise_for_status()
                
        except Exception as e:
            print(f"Failed to send Slack notification: {e}")
    
    async def _send_pagerduty_notification(self, alert: Alert, channel: NotificationChannel):
        """Send PagerDuty notification."""
        
        try:
            payload = {
                "routing_key": channel.config["integration_key"],
                "event_action": "trigger",
                "dedup_key": alert.id,
                "payload": {
                    "summary": alert.title,
                    "source": alert.source,
                    "severity": alert.severity,
                    "timestamp": alert.timestamp.isoformat(),
                    "component": "gastropartner-api",
                    "group": "monitoring",
                    "class": "system-alert",
                    "custom_details": {
                        "description": alert.description,
                        "alert_id": alert.id,
                        **alert.metadata
                    }
                },
                "links": [
                    {
                        "href": "https://gastropartner.com/status",
                        "text": "Status Page"
                    }
                ]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://events.pagerduty.com/v2/enqueue",
                    json=payload,
                    timeout=10.0
                )
                response.raise_for_status()
                
        except Exception as e:
            print(f"Failed to send PagerDuty notification: {e}")
    
    async def _send_webhook_notification(self, alert: Alert, channel: NotificationChannel):
        """Send webhook notification."""
        
        try:
            payload = {
                "alert": {
                    "id": alert.id,
                    "title": alert.title,
                    "description": alert.description,
                    "severity": alert.severity,
                    "source": alert.source,
                    "timestamp": alert.timestamp.isoformat(),
                    "metadata": alert.metadata
                },
                "event_type": "alert_created"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    channel.config["url"],
                    json=payload,
                    headers=channel.config.get("headers", {}),
                    timeout=10.0
                )
                response.raise_for_status()
                
        except Exception as e:
            print(f"Failed to send webhook notification: {e}")
    
    async def _send_email_resolution(self, alert: Alert, channel: NotificationChannel):
        """Send email resolution notification."""
        
        try:
            subject = f"✅ RESOLVED: {alert.title}"
            duration = alert.resolved_at - alert.timestamp if alert.resolved_at else None
            
            # TODO: Implement resolution email
            print(f"📧 EMAIL RESOLUTION: {subject}")
            print(f"   Duration: {duration}")
            
        except Exception as e:
            print(f"Failed to send email resolution: {e}")
    
    async def _send_slack_resolution(self, alert: Alert, channel: NotificationChannel):
        """Send Slack resolution notification."""
        
        try:
            duration = alert.resolved_at - alert.timestamp if alert.resolved_at else None
            duration_str = str(duration).split('.')[0] if duration else "Unknown"
            
            payload = {
                "channel": channel.config.get("channel", "#alerts"),
                "username": "GastroPartner Monitoring",
                "icon_emoji": ":white_check_mark:",
                "attachments": [
                    {
                        "color": "#22c55e",
                        "title": f"✅ RESOLVED: {alert.title}",
                        "text": f"Alert has been resolved after {duration_str}",
                        "fields": [
                            {
                                "title": "Alert ID",
                                "value": f"`{alert.id}`",
                                "short": True
                            },
                            {
                                "title": "Duration",
                                "value": duration_str,
                                "short": True
                            }
                        ],
                        "footer": "GastroPartner Monitoring",
                        "ts": int(alert.resolved_at.timestamp()) if alert.resolved_at else None
                    }
                ]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    channel.config["webhook_url"],
                    json=payload,
                    timeout=10.0
                )
                response.raise_for_status()
                
        except Exception as e:
            print(f"Failed to send Slack resolution: {e}")
    
    async def _send_pagerduty_resolution(self, alert: Alert, channel: NotificationChannel):
        """Send PagerDuty resolution notification."""
        
        try:
            payload = {
                "routing_key": channel.config["integration_key"],
                "event_action": "resolve",
                "dedup_key": alert.id
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://events.pagerduty.com/v2/enqueue",
                    json=payload,
                    timeout=10.0
                )
                response.raise_for_status()
                
        except Exception as e:
            print(f"Failed to send PagerDuty resolution: {e}")
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts."""
        return list(self.active_alerts.values())
    
    def get_alert(self, alert_id: str) -> Optional[Alert]:
        """Get a specific alert."""
        return self.active_alerts.get(alert_id)


# Global alert manager instance
alert_manager = AlertManager()


# Convenience functions for common alert scenarios
async def alert_service_down(service_name: str, details: str = ""):
    """Alert when a service goes down."""
    await alert_manager.create_alert(
        alert_id=f"service_down_{service_name}",
        title=f"Service Down: {service_name}",
        description=f"The {service_name} service is not responding. {details}",
        severity="critical",
        source=service_name,
        metadata={
            "service": service_name,
            "alert_type": "service_down",
            "details": details
        }
    )


async def alert_high_response_time(service_name: str, response_time_ms: float, threshold_ms: float = 5000):
    """Alert when response time is too high."""
    await alert_manager.create_alert(
        alert_id=f"high_response_time_{service_name}",
        title=f"High Response Time: {service_name}",
        description=f"Response time for {service_name} is {response_time_ms:.0f}ms (threshold: {threshold_ms:.0f}ms)",
        severity="high" if response_time_ms > threshold_ms * 2 else "medium",
        source=service_name,
        metadata={
            "service": service_name,
            "alert_type": "high_response_time",
            "response_time_ms": response_time_ms,
            "threshold_ms": threshold_ms
        }
    )


async def alert_database_connection_failed(error: str):
    """Alert when database connection fails."""
    await alert_manager.create_alert(
        alert_id="database_connection_failed",
        title="Database Connection Failed",
        description=f"Unable to connect to the database: {error}",
        severity="critical",
        source="database",
        metadata={
            "alert_type": "database_connection_failed",
            "error": error
        }
    )


async def resolve_service_alert(service_name: str, alert_type: str = "service_down"):
    """Resolve a service-related alert."""
    alert_id = f"{alert_type}_{service_name}"
    await alert_manager.resolve_alert(alert_id)