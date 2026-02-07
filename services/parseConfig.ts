
// Parse is completely disconnected for the MVP.
// The app now uses storageService (localStorage) for all data.

export const initParse = () => {
    console.log('Mobile App MVP: Using Local Storage (Backend Disconnected)');
};

// Exporting a dummy object to satisfy any remaining imports without crashing
const Parse = {};
export default Parse;
