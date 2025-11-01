import React, { useState, useEffect, useRef } from 'react';
import i18next from './i18n';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

const App = () => {
  const [destination, setDestination] = useState('');
  const [radius, setRadius] = useState('500');
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [vehicleType, setVehicleType] = useState('standard');
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
          limit: 6, 
          lang: lang 
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
      const data = await response.json();
      const filteredSuggestions = data.features.map(item => ({
        name: item.properties.formatted,
        lat: item.geometry.coordinates[1],
        lon: item.geometry.coordinates[0],
      }));
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
    if (vehicleType === 'telAvivResident' && specialRule.resident_discount) {
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
      .filter(lot => ownershipFilter === 'All' || lot.ownership_type === ownershipFilter)
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
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <div className="flex flex-col gap-6">
              <div className="relative z-10 mb-8">
                <label className="block mb-1 text-gray-700">{i18next.t('searchPlaceholder')}</label>
                <input
                  ref={destinationRef}
                  type="text"
                  value={destination}
                  onChange={handleInputChange}
                  onFocus={() => destination.length >= 3 && setShowSuggestions(true)}
                  placeholder={i18next.t('searchPlaceholder')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-20 w-full bg-white border-blue-200 rounded-lg mt-1 shadow-lg max-h-64 overflow-y-auto opacity-100 autocomplete-dropdown">
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        onMouseDown={() => handleSuggestionClick(suggestion)}
                        className={`p-3 text-sm text-gray-900 hover:bg-blue-100 hover:text-blue-600 cursor-pointer rounded-md transition-all duration-200 autocomplete-item ${index > 0 ? 'border-t border-gray-100' : ''}`}
                      >
                        {suggestion.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block mb-1 text-gray-700">{i18next.t('radiusLabel')}</label>
                <select
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="200">200m</option>
                  <option value="500">500m</option>
                  <option value="1000">1km</option>
                  <option value="2000">2km</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-gray-700">{i18next.t('durationLabel')}</label>
                <div className="flex items-center gap-4">
                  <div>
                    <input
                      type="number"
                      value={hours}
                      onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
                      placeholder={i18next.t('hours')}
                      className="w-20 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                    <span className="ml-2 text-gray-600">{i18next.t('hours')}</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      value={minutes}
                      onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                      placeholder={i18next.t('minutes')}
                      className="w-20 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="59"
                    />
                    <span className="ml-2 text-gray-600">{i18next.t('minutes')}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block mb-1 text-gray-700">{i18next.t('vehicleType')}</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">{i18next.t('standard')}</option>
                  <option value="telAvivResident">{i18next.t('telAvivResident')}</option>
                  <option value="disabled">{i18next.t('disabled')}</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-gray-700">{i18next.t('ownershipType')}</label>
                <select
                  value={ownershipFilter}
                  onChange={(e) => setOwnershipFilter(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">{i18next.t('select')}</option>
                  <option value="Public">{i18next.t('public')}</option>
                  <option value="Private">{i18next.t('private')}</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-gray-700">{i18next.t('maxDailyPrice')}</label>
                <select
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Unlimited">{i18next.t('select')}</option>
                  {Array.from({ length: 10 }, (_, i) => (i + 1) * 10).map(value => (
                    <option key={value} value={value}>{value} ₪</option>
                  ))}
                </select>
              </div>
              <button
                onClick={searchParkingLots}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? <span className="spinner"></span> : null}
                {i18next.t('searchButton')}
              </button>
            </div>
            <div className="mt-6">
              {parkingLots.length === 0 ? (
                <p className="text-gray-600">{i18next.t('noLotsFound')}</p>
              ) : (
                <div className="grid gap-4">
                  {parkingLots.map(lot => (
                    <div key={lot._id || lot.id} className="p-6 bg-white rounded-xl shadow-md border border-gray-200 parking-card">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{lot.street_name}</h3>
                      <p className="text-gray-700 text-sm mb-1"><span className="font-medium">{i18next.t('address')}:</span> {lot.address}</p>
                      <p className="text-gray-700"><span className="font-medium">{i18next.t('dayPrice')}:</span> ₪{lot.prices.dayPrice}</p>
                      <p className="text-gray-700"><span className="font-medium">{i18next.t('nightPrice')}:</span> ₪{lot.prices.nightPrice}</p>
                      {lot.prices.singleEntrancePrice != null && (
                        <p className="text-gray-700"><span className="font-medium">{i18next.t('singleEntrancePrice')}:</span> ₪{lot.prices.singleEntrancePrice}</p>
                      )}
                      <p className="text-gray-700"><span className="font-medium">{i18next.t('walkingTime')}:</span> {lot.walkingTime}</p>
                      <p className="text-gray-700 text-sm"><span className="font-medium">{i18next.t('totalCapacity')}:</span> {lot.total_spots} spots</p>
                      <a
                        href={`https://waze.com/ul?ll=${lot.latitude}%2C${lot.longitude}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-blue-500 hover:text-blue-600 underline"
                      >
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
  );
};

export default App;

