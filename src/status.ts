const statusBadge = document.querySelector<HTMLElement>('.status');
const statusIcon = document.querySelector<HTMLElement>('.status-icon');
const statusText = document.querySelector<HTMLElement>('#status-text');
const mountainHour = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  hour: '2-digit',
  hourCycle: 'h23',
});

function updateStatus() {
  if (!statusBadge || !statusIcon || !statusText) return;
  const hour = Number(mountainHour.format(new Date()));
  let icon = '✦';
  let message = 'Turning ideas into code';
  let mood = 'working';

  if (hour < 7 || hour >= 23) {
    icon = '☾';
    message = 'zZz · recharging';
    mood = 'sleeping';
  } else if (hour < 9) {
    icon = '✦';
    message = 'Finding a good idea';
    mood = 'morning';
  } else if (hour < 12) {
    icon = '⌘';
    message = 'Deep in a build';
  } else if (hour < 14) {
    icon = '☀';
    message = 'Out for lunch and fresh air';
    mood = 'outside';
  } else if (hour < 16) {
    icon = '⌘';
    message = 'Making the next thing work';
  } else if (hour < 19) {
    icon = '🏋';
    message = 'Not skipping leg day';
    mood = 'gym';
  } else if (hour < 21) {
    icon = '✈';
    message = 'Planning the next adventure';
    mood = 'outside';
  } else {
    icon = '☾';
    message = 'Winding down';
    mood = 'sleeping';
  }

  statusIcon.textContent = icon;
  statusText.textContent = message;
  statusBadge.dataset.mood = mood;
}

updateStatus();
window.setInterval(updateStatus, 60_000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateStatus();
});
