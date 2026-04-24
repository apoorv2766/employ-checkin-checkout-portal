const { formatInTimeZone, fromZonedTime, toZonedTime } = require('date-fns-tz');

function shiftTimeOnDate(timeStr, referenceDate, timezone) {
  const zonedDate = toZonedTime(referenceDate, timezone);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const shiftZoned = new Date(zonedDate);
  shiftZoned.setHours(hours, minutes, 0, 0);
  return fromZonedTime(shiftZoned, timezone);
}

const now = new Date();
console.log('Now (UTC):', now);
console.log('Now in IST:', formatInTimeZone(now, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'));

const shiftStart = shiftTimeOnDate('15:00', now, 'Asia/Kolkata');
console.log('Shift start (UTC):', shiftStart);
console.log('Shift start in IST:', formatInTimeZone(shiftStart, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'));

console.log('Is now >= shiftStart?', now >= shiftStart);
console.log('Difference in minutes:', Math.floor((now - shiftStart) / 60000));

const shiftEnd = shiftTimeOnDate('24:00', now, 'Asia/Kolkata');
console.log('Shift end (UTC):', shiftEnd);
console.log('Shift end in IST:', formatInTimeZone(shiftEnd, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'));
console.log('Is shiftEnd <= shiftStart?', shiftEnd <= shiftStart);