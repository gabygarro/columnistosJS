export const getUTCDateForDB = () =>
  new Date().toISOString().slice(0, 19).replace('T', ' ');

export const getYesterdaysDate = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const day = String(yesterday.getDate()).padStart(2, '0');
  const month = String(yesterday.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const year = yesterday.getFullYear();

  return `${day}/${month}/${year}`;
};
