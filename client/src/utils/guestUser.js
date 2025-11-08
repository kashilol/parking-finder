// Generate or retrieve guest user ID
export const getGuestUserId = () => {
    let guestId = localStorage.getItem('guestUserId');
    
    if (!guestId) {
      // Generate unique guest ID (like Waze)
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('guestUserId', guestId);
      localStorage.setItem('guestCreatedAt', new Date().toISOString());
    }
    
    return guestId;
  };
  
  // Get guest profile
  export const getGuestProfile = () => {
    const guestId = getGuestUserId();
    const profileKey = `profile_${guestId}`;
    const savedProfile = localStorage.getItem(profileKey);
    
    if (savedProfile) {
      return JSON.parse(savedProfile);
    }
    
    // Create new guest profile
    const newProfile = {
      id: guestId,
      type: 'guest',
      createdAt: new Date().toISOString(),
      vehicles: [],
      preferences: {
        defaultRadius: 2000,
        defaultDuration: { hours: 1, minutes: 0 }
      },
      searchHistory: []
    };
    
    localStorage.setItem(profileKey, JSON.stringify(newProfile));
    return newProfile;
  };
  
  // Update guest profile
  export const updateGuestProfile = (updates) => {
    const profile = getGuestProfile();
    const updated = { ...profile, ...updates };
    const profileKey = `profile_${profile.id}`;
    localStorage.setItem(profileKey, JSON.stringify(updated));
    return updated;
  };
  
  // Save guest vehicles
  export const saveGuestVehicles = (vehicles) => {
    const profile = getGuestProfile();
    profile.vehicles = vehicles;
    const profileKey = `profile_${profile.id}`;
    localStorage.setItem(profileKey, JSON.stringify(profile));
  };
  
  // Get guest vehicles
  export const getGuestVehicles = () => {
    const profile = getGuestProfile();
    return profile.vehicles || [];
  };
  
  // Check if user is logged in (not guest)
  export const isRegisteredUser = () => {
    return !!localStorage.getItem('authToken');
  };
  
  // Get display name
  export const getDisplayName = () => {
    if (isRegisteredUser()) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.name || user.email || 'User';
    }
    return 'Guest';
  };
  