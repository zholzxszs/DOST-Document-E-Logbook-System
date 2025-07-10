function formatDateForDatabase(dateString) {
  if (!dateString) return null;
  
  let date;
  if (typeof dateString === 'string') {
    // If ISO string, parse as local time
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateString)) {
      // Remove 'T' and everything after seconds, then parse as local
      const localString = dateString.replace('T', ' ').replace(/\..*$/, '');
      date = new Date(localString);
    } else {
      date = new Date(dateString);
    }
  } else {
    date = dateString;
  }
  
  if (isNaN(date.getTime())) return null;

  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  // Get current time if not provided
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${month} ${day}, ${year} at ${displayHours}:${minutes} ${ampm}`;
}

module.exports = formatDateForDatabase;