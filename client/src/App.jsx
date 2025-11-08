import React, { useState, useEffect, useRef } from 'react';
import i18next from './i18n';
import TimePicker from './components/TimePicker';
import VehicleSelector from './components/VehicleSelector';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

const App = () => {
  const [destination, setDestination] = useState('');
  const [radius, setRadius] = useState('2000');
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const vehicleType = selectedVehicle?.type || 'standard';
  const [parkingLots, setParkingLots] = useState([]);
  const [center, setCenter] = useState({ lat: 32.0853, lng: 34.7818 });
  const [error, setError] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('All');
  const [maxPriceFilter, setMaxPriceFilter] = useState('Unlimited');
  const [adminMode, setAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authToken, setAuthToken] = useState(localStorage.getItem('adminToken'));
  const [adminError, setAdminError] = useState('');
  const [allLots, setAllLots] = useState([]);
  const [editingLot, setEditingLot] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showVehiclesPanel, setShowVehiclesPanel] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const destinationRef = useRef(null);
  const debounceTimeout = useRef(null);
  
  useEffect(() => {
    if (authToken) {
      verifyToken();
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/parking-lots`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!response.ok) throw new Error('Token invalid');
    } catch (error) {
      console.log('Token verification failed, logging out');
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAuthToken(null);
    setAdminMode(false);
    setAdminPassword('');
    setAllLots([]);
    setEditingLot(null);
    setAdminError('');
  };

  const normalizeLanguage = (lang) => {
    if (!lang) return 'en';
    const baseLang = lang.split('-')[0];
    const supportedLanguages = [
      'ab', 'aa', 'af', 'ak', 'sq', 'am', 'ar', 'an', 'hy', 'as', 'av', 'ae', 'ay', 'az', 'bm', 'ba', 'eu', 'be',
      'bn', 'bh', 'bi', 'bs', 'br', 'bg', 'my', 'ca', 'ch', 'ce', 'ny', 'zh', 'cv', 'kw', 'co', 'cr', 'hr', 'cs', 'da',
      'dv', 'nl', 'en', 'eo', 'et', 'ee', 'fo', 'fj', 'fi', 'fr', 'ff', 'gl', 'ka', 'de', 'el', 'gn', 'gu', 'ht', 'ha',
      'he', 'hz', 'hi', 'ho', 'hu', 'ia', 'id', 'ie', 'ga', 'ig', 'ik', 'io', 'is', 'it', 'iu', 'ja', 'jv', 'kl', 'kn',
      'kr', 'ks', 'kk', 'km', 'ki', 'rw', 'ky', 'kv', 'kg', 'ko', 'ku', 'kj', 'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt',
      'lu', 'lv', 'gv', 'mk', 'mg', 'ms', 'ml', 'mt', 'mi', 'mr', 'mh', 'mn', 'na', 'nv', 'nb', 'nd', 'ne', 'ng', 'nn',
      'no', 'ii', 'nr', 'oc', 'oj', 'cu', 'om', 'or', 'os', 'pa', 'pi', 'fa', 'pl', 'ps', 'pt', 'qu', 'rm', 'rn', 'ro',
      'ru', 'sa', 'sc', 'sd', 'se', 'sm', 'sg', 'sr', 'gd', 'sn', 'si', 'sk', 'sl', 'so', 'st', 'es', 'su', 'sw', 'ss',
      'sv', 'ta', 'te', 'tg', 'th', 'ti', 'bo', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty', 'ug', 'uk', 'ur',
      'uz', 've', 'vi', 'vo', 'wa', 'cy', 'wo', 'fy', 'xh', 'yi', 'yo', 'za'
    ];
    return supportedLanguages.includes(baseLang) ? baseLang : 'en';
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
  };

  const calculateWalkingTime = (distanceMeters) => {
    const walkingSpeed = 83.33;
    const timeMinutes = distanceMeters / walkingSpeed;
    const minutes = Math.floor(timeMinutes % 60);
    const hours = Math.floor(timeMinutes / 60);
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}min`;
  };

  const fetchSuggestions = async (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
  
    try {
      const isHebrew = /[\u0590-\u05FF]/.test(trimmedQuery);
      const lang = normalizeLanguage(isHebrew ? 'he' : i18next.language);
      
      const response = await fetch(`${API_BASE_URL}/geocode/autocomplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: trimmedQuery, 
          limit: 10, // Get more results to filter
          lang: lang 
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
      const data = await response.json();
      
      // Filter to only Tel Aviv results
      const telAvivResults = data.features.filter(item => {
        const props = item.properties;
        const city = props.city || '';
        const county = props.county || '';
        const state = props.state || '';
        const country = props.country || '';
        
        // Must be in Israel
        if (country !== 'Israel' && country !== 'ישראל') return false;
        
        // Must be Tel Aviv or nearby
        const isTelAviv = 
          city.includes('Tel Aviv') || 
          city.includes('תל אביב') ||
          city.includes('תל־אביב') ||
          county.includes('Tel Aviv') || 
          county.includes('תל אביב') ||
          state.includes('Tel Aviv') ||
          state.includes('תל אביב');
        
        return isTelAviv;
      });
      
      // Format suggestions to be cleaner
      const filteredSuggestions = telAvivResults.slice(0, 6).map(item => {
        const props = item.properties;
        
        // Build clean main name
        let mainName = props.street || props.name || '';
        if (props.housenumber) {
          mainName = `${mainName} ${props.housenumber}`;
        }
        
        // Build subtext (just city and country, no postal code)
        let subtext = 'תל אביב, ישראל'; // Default
        if (props.district || props.suburb) {
          subtext = `${props.district || props.suburb}, תל אביב`;
        }
        
        return {
          name: mainName || props.formatted,
          subtext: subtext,
          lat: item.geometry.coordinates[1],
          lon: item.geometry.coordinates[0],
        };
      });
      
      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Suggestions error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const geocodeDestination = async (address) => {
    try {
      const trimmedAddress = address.trim();
      if (!trimmedAddress) throw new Error('Address is empty');
      const isHebrew = /[\u0590-\u05FF]/.test(trimmedAddress);
      const lang = normalizeLanguage(isHebrew ? 'he' : i18next.language);
      
      const response = await fetch(`${API_BASE_URL}/geocode/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: trimmedAddress, 
          lang: lang 
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.features.length > 0) {
        const item = data.features[0];
        return { lat: item.geometry.coordinates[1], lng: item.geometry.coordinates[0] };
      } else {
        throw new Error('No results found for the address');
      }
    } catch (error) {
      setError('Failed to geocode destination: ' + error.message);
      return null;
    }
  };  

    // Pricing strategy functions
  const pricingStrategies = {
    // Strategy 1: Hourly Blocks (Standard)
    hourly_blocks: (lot, totalMinutes, vehicleType) => {
      const rules = Array.isArray(lot.pricing_rules) ? lot.pricing_rules : [];
      const standardRule = rules.find(r => r.type === 'standard') || {};
      
      const firstBlockDuration = standardRule.first_block_duration || 60;
      const firstBlockPrice = standardRule.first_block_price || 0;
      const additionalBlockDuration = standardRule.additional_block_duration || 60;
      const additionalBlockPrice = standardRule.additional_block_price || 0;
      const maxDailyPrice = standardRule.max_daily_price || Infinity;
      
      let price = firstBlockPrice;
      
      if (totalMinutes > firstBlockDuration) {
        const remainingMinutes = totalMinutes - firstBlockDuration;
        const additionalBlocks = Math.ceil(remainingMinutes / additionalBlockDuration);
        price += (additionalBlocks * additionalBlockPrice);
      }
      
      return Math.min(price, maxDailyPrice);
    },
    
    // Strategy 2: Minute Blocks (15/30 min increments)
    minute_blocks: (lot, totalMinutes, vehicleType) => {
      const rules = Array.isArray(lot.pricing_rules) ? lot.pricing_rules : [];
      const standardRule = rules.find(r => r.type === 'standard') || {};
      
      const firstBlockDuration = standardRule.first_block_duration || 60;
      const firstBlockPrice = standardRule.first_block_price || 0;
      const additionalBlockDuration = standardRule.additional_block_duration || 15;
      const additionalBlockPrice = standardRule.additional_block_price || 0;
      const maxDailyPrice = standardRule.max_daily_price || Infinity;
      
      let price = firstBlockPrice;
      
      if (totalMinutes > firstBlockDuration) {
        const remainingMinutes = totalMinutes - firstBlockDuration;
        const additionalBlocks = Math.ceil(remainingMinutes / additionalBlockDuration);
        price += (additionalBlocks * additionalBlockPrice);
      }
      
      return Math.min(price, maxDailyPrice);
    },
    
    // Strategy 3: Flat Daily Rate
    flat_daily: (lot, totalMinutes, vehicleType) => {
      const rules = Array.isArray(lot.pricing_rules) ? lot.pricing_rules : [];
      const standardRule = rules.find(r => r.type === 'standard') || {};
      return standardRule.max_daily_price || standardRule.first_block_price || 0;
    },
    
    // Strategy 4: Progressive (Cheaper as you park longer)
    progressive: (lot, totalMinutes, vehicleType) => {
      const rules = Array.isArray(lot.pricing_rules) ? lot.pricing_rules : [];
      const standardRule = rules.find(r => r.type === 'standard') || {};
      
      const hours = Math.ceil(totalMinutes / 60);
      const firstHourPrice = standardRule.first_block_price || 10;
      const maxDailyPrice = standardRule.max_daily_price || Infinity;
      
      let price = firstHourPrice;
      
      for (let i = 2; i <= hours; i++) {
        const discountFactor = Math.max(0.5, 1 - (i * 0.1));
        price += (firstHourPrice * discountFactor);
      }
      
      return Math.min(price, maxDailyPrice);
    }
  };

  // Main calculate price function
function calculatePrice(lot, hours, minutes, vehicleType) {
  const totalMinutes = Math.max(1, hours * 60 + minutes);
  const strategy = lot.pricing_strategy || 'hourly_blocks';

  // Get base price from strategy
  const pricingFunction = pricingStrategies[strategy] || pricingStrategies.hourly_blocks;
  let price = pricingFunction(lot, totalMinutes, vehicleType);

  // Apply discounts (works for all strategies)
  const rules = Array.isArray(lot.pricing_rules) ? lot.pricing_rules : [];
  const specialRule = rules.find(r => r.type === 'special') || {};

  let discount = 0;
  if (vehicleType === 'resident' && specialRule.resident_discount) {
    discount = specialRule.resident_discount;
  } else if (vehicleType === 'disabled' && specialRule.disabled_discount) {
    discount = specialRule.disabled_discount;
  }

  if (discount > 0) {
    price *= (1 - discount);
  }

  return {
    dayPrice: Number(price.toFixed(2)),
    nightPrice: Number(price.toFixed(2)),
    singleEntrancePrice: null,
    resetTime: null
  };
}


  const searchParkingLots = async () => {
    // Validate destination is entered
    if (!destination || destination.trim().length === 0) {
      setError('Please enter a destination first');
      return;
    } 

    setError('');
    setLoading(true);
    try {
      let searchCenter = center;
      if (destination) {
        searchCenter = await geocodeDestination(destination + ', Tel Aviv, Israel');
        if (!searchCenter) {
          setLoading(false);
          return;
        }
        setCenter(searchCenter);
      }
      
      const response = await fetch(
        `${API_BASE_URL}/parking-lots?lat=${searchCenter.lat}&lng=${searchCenter.lng}&radius=${radius}`
      );
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const lots = await response.json();
      
      const processedLots = lots.map(lot => {
        // MongoDB stores coordinates in location.coordinates [lng, lat]
        const lotLat = lot.location?.coordinates?.[1] || lot.latitude;
        const lotLng = lot.location?.coordinates?.[0] || lot.longitude;
        
        const distance = calculateDistance(searchCenter.lat, searchCenter.lng, lotLat, lotLng);
        const prices = calculatePrice(lot, hours, minutes, vehicleType);
        const walkingTime = calculateWalkingTime(distance);
        
        // Add latitude/longitude for easy access in JSX
        return { 
          ...lot, 
          latitude: lotLat,
          longitude: lotLng,
          distance, 
          prices, 
          walkingTime 
        };
      })
      .filter(lot => maxPriceFilter === 'Unlimited' || lot.prices.dayPrice <= parseFloat(maxPriceFilter))
      .sort((a, b) => a.distance - b.distance);
      
      setParkingLots(processedLots);
    } catch (error) {
      console.error('Error fetching parking lots:', error);
      setError('Failed to find parking lots: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLots = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/parking-lots`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const lots = await response.json();
      setAllLots(lots);
    } catch (error) {
      console.error('Error fetching all lots:', error);
      setAdminError('Failed to fetch parking lots: ' + error.message);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const { token } = await response.json();
      localStorage.setItem('adminToken', token);
      setAuthToken(token);
      setAdminMode(true);
      setAdminPassword('');
      fetchAllLots();
    } catch (error) {
      console.error('Login error:', error);
      setAdminError('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminError('');
    setLoading(true);
    
    const formData = new FormData(e.target);
    const lotData = {
      street_name: formData.get('street_name'),
      address: formData.get('address'),
      latitude: parseFloat(formData.get('latitude')),
      longitude: parseFloat(formData.get('longitude')),
      operating_hours: formData.get('operating_hours') || '24/7',
      total_spots: parseInt(formData.get('total_spots')) || 0,
      ownership_type: formData.get('ownership_type') || 'Public',
      pricing_strategy: formData.get('pricing_strategy') || 'hourly_blocks', // ⭐ ADD THIS LINE
      pricing_rules: [
        {
          type: 'standard',
          first_block_duration: parseInt(formData.get('first_block_duration')) || 60,
          first_block_price: parseFloat(formData.get('first_block_price')) || 0,
          additional_block_duration: parseInt(formData.get('additional_block_duration')) || 60,
          additional_block_price: parseFloat(formData.get('additional_block_price')) || 0,
          minimum_price: parseFloat(formData.get('minimum_price')) || 0,
          max_daily_price: parseFloat(formData.get('max_daily_price')) || null,
          single_entrance_price: parseFloat(formData.get('single_entrance_price')) || null,
          app_first_block_price: parseFloat(formData.get('app_first_block_price')) || 0,
          app_additional_block_price: parseFloat(formData.get('app_additional_block_price')) || 0,
          app_max_daily_price: parseFloat(formData.get('app_max_daily_price')) || null,
        },
        ...['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => ({
          type: 'day',
          day,
          price: parseFloat(formData.get(`price_${day}`)) || 0,
          night_start: formData.get(`night_start_${day}`) || '20:00',
          night_end: formData.get(`night_end_${day}`) || '08:00',
          night_price: parseFloat(formData.get(`night_price_${day}`)) || 0,
          day_price: parseFloat(formData.get(`day_price_${day}`)) || 0,
          app_price: parseFloat(formData.get(`app_price_${day}`)) || 0,
          app_night_price: parseFloat(formData.get(`app_night_price_${day}`)) || 0,
          app_day_price: parseFloat(formData.get(`app_day_price_${day}`)) || 0,
          reset_time: formData.get(`reset_time_${day}`) || null,
        })),
        {
          type: 'special',
          resident_discount: parseFloat(formData.get('resident_discount')) || 0,
          disabled_discount: parseFloat(formData.get('disabled_discount')) || 0,
          app_discount: parseFloat(formData.get('app_discount')) || 0,
          custom_tags: formData.get('custom_tags')?.split(',').map(t => ({ tag: t.trim(), discount: parseFloat(formData.get(`custom_discount_${t.trim()}`)) || 0 })) || [],
        },
      ],
      notes: formData.get('notes') || '',
    };

    if (!lotData.street_name || !lotData.address || isNaN(lotData.latitude) || isNaN(lotData.longitude)) {
      setAdminError('Street name, address, latitude, and longitude are required');
      setLoading(false);
      return;
    }

    try {
      const headers = { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${authToken}` 
      };
      let response;
      if (editingLot) {
        response = await fetch(`${API_BASE_URL}/parking-lots/${editingLot._id || editingLot.id}`, { 
          method: 'PUT', 
          headers, 
          body: JSON.stringify(lotData) 
        });
      } else {
        response = await fetch(`${API_BASE_URL}/parking-lots`, { 
          method: 'POST', 
          headers, 
          body: JSON.stringify(lotData) 
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok');
      }
      
      fetchAllLots();
      Object.keys(e.target.elements).forEach(key => {
        e.target.elements[key].value = '';
      });
      e.target.reset();
      setEditingLot(null);
      setAdminError('');
    } catch (error) {
      console.error('Error saving parking lot:', error);
      setAdminError('Failed to save parking lot: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLot = (lot) => {
    setEditingLot(lot);
    setAdminError('');
    
    // Populate form with lot data
    setTimeout(() => {
      const form = document.querySelector('form[name="parkingLotForm"]');
      if (form) {
        form.street_name.value = lot.street_name || '';
        form.address.value = lot.address || '';
        // ⭐ FIX: Get coordinates from location object
        form.latitude.value = lot.location?.coordinates?.[1] || lot.latitude || '';
        form.longitude.value = lot.location?.coordinates?.[0] || lot.longitude || '';
        form.operating_hours.value = lot.operating_hours || '24/7';
        form.total_spots.value = lot.total_spots || 0;
        form.ownership_type.value = lot.ownership_type || 'Public';
        form.pricing_strategy.value = lot.pricing_strategy || 'hourly_blocks';
        
        // Pricing rules fields
        const standardRule = lot.pricing_rules?.find(r => r.type === 'standard') || {};
        form.first_block_duration.value = standardRule.first_block_duration || 60;
        form.first_block_price.value = standardRule.first_block_price || 0;
        form.app_first_block_price.value = standardRule.app_first_block_price || 0;
        form.additional_block_duration.value = standardRule.additional_block_duration || 60;
        form.additional_block_price.value = standardRule.additional_block_price || 0;
        form.max_daily_price.value = standardRule.max_daily_price || '';
        form.single_entrance_price.value = standardRule.single_entrance_price || '';
        
        // Special discounts
        const specialRule = lot.pricing_rules?.find(r => r.type === 'special') || {};
        form.resident_discount.value = specialRule.resident_discount || 0;
        form.disabled_discount.value = specialRule.disabled_discount || 0;
        
        // Notes
        form.notes.value = lot.notes || '';
      }
    }, 100);
  };
  const handleDeleteLot = async (id) => {
    if (!confirm(i18next.t('confirmDelete'))) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/parking-lots/${id}`, { 
        method: 'DELETE', 
        headers: { 'Authorization': `Bearer ${authToken}` } 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok');
      }
      
      fetchAllLots();
    } catch (error) {
      console.error('Error deleting parking lot:', error);
      setAdminError('Failed to delete parking lot: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminMode = () => {
    if (adminMode) {
      handleLogout();
    } else {
      setAdminMode(true);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setDestination(suggestion.name);
    setCenter({ lat: suggestion.lat, lng: suggestion.lon });
    setShowSuggestions(false);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setDestination(value);
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    if (value.length >= 3) {
      debounceTimeout.current = setTimeout(() => fetchSuggestions(value), 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (destinationRef.current && !destinationRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (adminMode && authToken) {
      fetchAllLots();
    }
  }, [adminMode, authToken]);
  
  useEffect(() => {
    if (editingLot) {
      // Scroll to form when editing
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editingLot]);

  // ========== PART 2 STARTS HERE ==========
  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        className="fixed top-5 left-5 z-40 shadow bg-white rounded-full p-3 hover:bg-primary-50"
        onClick={() => setShowSidebar(true)}
        aria-label="Open menu"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
      >
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="7" x2="24" y2="7" />
          <line x1="4" y1="14" x2="24" y2="14" />
          <line x1="4" y1="21" x2="24" y2="21" />
        </svg>
      </button>
  
      {/* Sidebar Drawer */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-40"
            onClick={() => setShowSidebar(false)}
            tabIndex={-1}
          />
          {/* Drawer Content */}
          <div className="relative bg-white w-80 max-w-full h-full shadow-2xl p-6 flex flex-col overflow-y-auto z-50 animate-slide-in-left">

            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-primary-600"
              onClick={() => setShowSidebar(false)}
              aria-label="Close menu"
            >
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            {/* Profile Info */}
            <div className="mb-8 mt-10 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl">👤</div>
              <div>
                <div className="font-bold text-lg text-gray-800">Guest</div>
                <div className="text-xs text-gray-500">Profile & Settings</div>
              </div>
            </div>

            {/* Menu List */}
            <div className="flex flex-col space-y-4">
              <button
                className="text-left w-full font-semibold text-primary-700 hover:bg-primary-50 px-3 py-2 rounded-lg flex items-center gap-2"
                onClick={() => setShowVehiclesPanel(true)}
              >
                🚗 My Vehicles
              </button>
              <button
                className="text-left w-full font-semibold text-primary-700 hover:bg-primary-50 px-3 py-2 rounded-lg flex items-center gap-2"
                onClick={() => alert('Settings coming soon!')}
              >
                ⚙️ Settings
              </button>
              <button
                className="text-left w-full font-semibold text-primary-700 hover:bg-primary-50 px-3 py-2 rounded-lg flex items-center gap-2"
                onClick={() => alert('Accessibility coming soon!')}
              >
                ♿ Accessibility
              </button>
            </div>

            {/* My Vehicles Panel */}
            {showVehiclesPanel && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-800">My Vehicles</h2>
                  <button
                    onClick={() => setShowVehiclesPanel(false)}
                    className="text-gray-400 hover:text-primary-600"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <VehicleSelector
                  selectedVehicleId={selectedVehicle?.id}
                  onVehicleSelect={setSelectedVehicle}
                  onOpenAuth={() => alert('Login/sign-up coming soon!')}
                />
              </div>
            )}
          </div>
        </div>
      )}
    <div className="min-h-screen bg-gray-100 p-8">
      <style>{`
        body {
          background-color: #F3F4F6 !important;
        }
        .parking-card {
          transition: all 0.2s ease-in-out;
          cursor: pointer;
        }
        .parking-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
        .autocomplete-dropdown {
          background-color: white !important;
          border: 1px solid #BFDBFE !important;
          z-index: 20 !important;
          max-height: 256px !important;
          overflow-y: auto !important;
          opacity: 1 !important;
          border-radius: 8px !important;
          margin-top: 4px !important;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
        }
        .autocomplete-item {
          padding: 12px !important;
          font-size: 14px !important;
          color: #111827 !important;
          cursor: pointer !important;
          border-top: 1px solid #F3F4F6 !important;
          border-radius: 6px !important;
        }
        .autocomplete-item:hover {
          background-color: #DBEAFE !important;
          color: #2563EB !important;
        }
        .autocomplete-item:first-child {
          border-top: none !important;
        }
        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
          display: inline-block;
          margin-right: 8px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">{i18next.t('title')}</h1>
        <button
          onClick={toggleAdminMode}
          className="mb-6 px-6 py-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transform hover:scale-105 transition-all duration-200"
        >
          {adminMode ? i18next.t('exitAdminMode') : i18next.t('enterAdminMode')}
        </button>

        {adminMode ? (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">{i18next.t('adminPanel')}</h2>
            
            {!authToken ? (
              <form onSubmit={handleAdminLogin} className="mb-6">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder={i18next.t('adminPassword')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? <span className="spinner"></span> : null}
                  Login
                </button>
              </form>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-green-600 font-semibold">✓ Logged in as Admin</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
            
            {adminError && <p className="text-red-500 mt-2 mb-4">{adminError}</p>}
            
            {authToken && (
              <>
                <form 
                  name="parkingLotForm"
                  key={editingLot?._id || editingLot?.id || 'new'} 
                  onSubmit={handleAdminSubmit} 
                  className="grid grid-cols-2 gap-6 mt-4"
                >
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('streetName')}</label>
                    <input
                      type="text"
                      name="street_name"
                      defaultValue={editingLot?.street_name || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('address')}</label>
                    <input
                      type="text"
                      name="address"
                      defaultValue={editingLot?.address || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('latitude')}</label>
                    <input
                      type="number"
                      name="latitude"
                      step="any"
                      defaultValue={editingLot?.latitude || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('longitude')}</label>
                    <input
                      type="number"
                      name="longitude"
                      step="any"
                      defaultValue={editingLot?.longitude || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('operatingHours')}</label>
                    <input
                      type="text"
                      name="operating_hours"
                      defaultValue={editingLot?.operating_hours || '24/7'}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('totalCapacity')}</label>
                    <input
                      type="number"
                      name="total_spots"
                      defaultValue={editingLot?.total_spots || 0}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('ownershipType')}</label>
                    <select
                      name="ownership_type"
                      defaultValue={editingLot?.ownership_type || 'Public'}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Public">{i18next.t('public')}</option>
                      <option value="Private">{i18next.t('private')}</option>
                    </select>
                  </div>

                  {/* ⭐ NEW FIELD - Pricing Strategy */}
                  <div>
                    <label className="block mb-1 text-gray-700">Pricing Strategy</label>
                    <select
                      name="pricing_strategy"
                      defaultValue={editingLot?.pricing_strategy || 'hourly_blocks'}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hourly_blocks">Hourly Blocks (Standard)</option>
                      <option value="minute_blocks">Minute Blocks (15/30 min)</option>
                      <option value="flat_daily">Flat Daily Rate</option>
                      <option value="time_of_day">Time of Day (Peak/Off-Peak)</option>
                      <option value="progressive">Progressive (Cheaper per hour)</option>
                      <option value="event_based">Event Based Pricing</option>
                   </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('firstBlockDuration')}</label>
                    <input
                      type="number"
                      name="first_block_duration"
                      defaultValue={editingLot?.pricing_rules?.find(r => r.type === 'standard')?.first_block_duration || 60}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('priceFirstHour')}</label>
                    <input
                      type="number"
                      step="any"
                      name="first_block_price"
                      defaultValue={editingLot?.pricing_rules?.find(r => r.type === 'standard')?.first_block_price || 0}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('appFirstBlockPrice')}</label>
                    <input
                      type="number"
                      step="any"
                      name="app_first_block_price"
                      defaultValue={editingLot?.pricing_rules?.find(r => r.type === 'standard')?.app_first_block_price || 0}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('additionalBlockDuration')}</label>
                    <input
                      type="number"
                      name="additional_block_duration"
                      defaultValue={editingLot?.pricing_rules?.find(r => r.type === 'standard')?.additional_block_duration || 15}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('priceAdditionalHour')}</label>
                    <input
                      type="number"
                      step="any"
                      name="additional_block_price"
                      defaultValue={editingLot?.pricing_rules?.find(r => r.type === 'standard')?.additional_block_price || 0}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('maxDailyPrice')}</label>
                    <input
                      type="number"
                      step="any"
                      name="max_daily_price"
                      defaultValue={editingLot?.pricing_rules?.find(r => r.type === 'standard')?.max_daily_price || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('singleEntrancePrice')}</label>
                    <input
                      type="number"
                      step="any"
                      name="single_entrance_price"
                      defaultValue={editingLot?.pricing_rules?.find(r => r.type === 'standard')?.single_entrance_price || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('residentDiscount')}</label>
                    <input
                      type="number"
                      step="any"
                      name="resident_discount"
                      defaultValue={editingLot?.pricing_rules?.find(r => r.type === 'special')?.resident_discount || 0}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.0 - 1.0"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-700">{i18next.t('disabledDiscount')}</label>
                    <input
                      type="number"
                      step="any"
                      name="disabled_discount"
                      defaultValue={editingLot?.pricing_rules?.find(r => r.type === 'special')?.disabled_discount || 0}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.0 - 1.0"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block mb-1 text-gray-700">{i18next.t('notes')}</label>
                    <textarea
                      name="notes"
                      defaultValue={editingLot?.notes || ''}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="col-span-2 px-6 py-2 bg-green-500 text-white rounded-full hover:bg-green-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? <span className="spinner"></span> : null}
                    {editingLot ? i18next.t('updateLot') : i18next.t('addLot')}
                  </button>
                </form>
                
                <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-900">{i18next.t('existingLots')}</h3>
                {allLots.length === 0 ? (
                  <p className="text-gray-600">{i18next.t('noLotsFound')}</p>
                ) : (
                  <ul className="space-y-3">
                    {allLots.map(lot => (
                      <li key={lot._id || lot.id} className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500 flex justify-between items-center hover:bg-gray-100 transition-all duration-200">
                        <span className="text-gray-800">{lot.street_name} ({lot.address})</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditLot(lot)}
                            className="px-4 py-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transform hover:scale-105 transition-all duration-200"
                          >
                            {i18next.t('edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteLot(lot._id || lot.id)}
                            className="px-4 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 transform hover:scale-105 transition-all duration-200"
                          >
                            {i18next.t('delete')}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl shadow-soft">
                <p className="text-red-600 font-medium flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </p>
              </div>
            )}
        
            {/* Simplified Search Form */}
            <div className="flex flex-col gap-6">
              {/* Destination Search Input */}
              <div className="relative z-10">
                <label className="block mb-2 text-lg font-bold text-gray-800">
                  📍 {i18next.t('searchPlaceholder')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    ref={destinationRef}
                    type="text"
                    value={destination}
                    onChange={handleInputChange}
                    onFocus={() => destination.length >= 3 && setShowSuggestions(true)}
                    placeholder={i18next.t('searchPlaceholder')}
                    className="w-full pl-11 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 shadow-soft hover:border-gray-300 text-gray-900 placeholder-gray-400 font-medium"
                  />
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-20 w-full bg-white border-2 border-primary-100 rounded-xl mt-2 shadow-large max-h-64 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        onMouseDown={() => handleSuggestionClick(suggestion)}
                        className={`p-4 hover:bg-primary-50 cursor-pointer transition-all duration-150 ${index === 0 ? 'rounded-t-xl' : ''} ${index === suggestions.length - 1 ? 'rounded-b-xl' : ''} ${index > 0 ? 'border-t border-gray-100' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <svg className="h-4 w-4 text-primary-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{suggestion.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{suggestion.subtext}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* iOS-Style Time Picker */}
              <div>
                <label className="block mb-3 text-lg font-bold text-gray-800">
                  ⏱️ {i18next.t('durationLabel')}
                </label>
                <TimePicker 
                  hours={hours} 
                  minutes={minutes} 
                  onTimeChange={(newHours, newMinutes) => {
                    setHours(newHours);
                    setMinutes(newMinutes);
                  }}
                />
              </div>

              {/* Search Button - Big & Bold */}
              <button
                onClick={searchParkingLots}
                disabled={loading}
                className="w-full py-5 px-6 gradient-primary text-white font-bold rounded-2xl shadow-large hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xl mt-4"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>מחפש...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>{i18next.t('searchButton')}</span>
                  </>
                )}
              </button>
            </div>
        
            {/* Results Section */}
            <div className="mt-8">
              {parkingLots.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <p className="text-gray-500 font-medium">{i18next.t('noLotsFound')}</p>
                </div>
              ) : (
                <div className="grid gap-5">
                  {parkingLots.map(lot => (
                    <div key={lot._id || lot.id} className="p-6 bg-white rounded-2xl shadow-medium border-2 border-gray-100 hover:shadow-large hover:border-primary-200 transition-all duration-300">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-900">{lot.street_name}</h3>
                        <span className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-semibold">
                          {lot.ownership_type}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4 flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {lot.address}
                      </p>
        
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-primary-50 rounded-xl p-3">
                          <p className="text-xs text-primary-600 font-semibold mb-1">{i18next.t('dayPrice')}</p>
                          <p className="text-2xl font-bold text-primary-700">₪{lot.prices.dayPrice}</p>
                        </div>
                        <div className="bg-secondary-50 rounded-xl p-3">
                          <p className="text-xs text-secondary-600 font-semibold mb-1">{i18next.t('walkingTime')}</p>
                          <p className="text-2xl font-bold text-secondary-700">{lot.walkingTime}</p>
                        </div>
                      </div>
        
                      {lot.prices.singleEntrancePrice != null && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">{i18next.t('singleEntrancePrice')}:</span> ₪{lot.prices.singleEntrancePrice}
                        </p>
                      )}
        
                      <p className="text-sm text-gray-600 mb-4">
                        <span className="font-semibold">{i18next.t('totalCapacity')}:</span> {lot.total_spots} spots
                      </p>
        
                      <a
                        href={`https://waze.com/ul?ll=${lot.latitude}%2C${lot.longitude}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3 gradient-accent text-white font-bold rounded-xl shadow-soft hover:shadow-medium transition-all duration-200"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        {i18next.t('navigateWaze')}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
  </>
);
};

export default App;

