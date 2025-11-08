import React, { useState, useEffect } from 'react';
import { getGuestVehicles, saveGuestVehicles, isRegisteredUser, getDisplayName } from '../utils/guestUser';

const VehicleSelector = ({ selectedVehicleId, onVehicleSelect, onOpenAuth }) => {
  const [vehicles, setVehicles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [userDisplayName, setUserDisplayName] = useState('');

  // Load user info and vehicles from guest profile
  useEffect(() => {
    setUserDisplayName(getDisplayName());
    const savedVehicles = getGuestVehicles();
    setVehicles(savedVehicles);

    if (!selectedVehicleId && savedVehicles.length > 0) {
      onVehicleSelect(savedVehicles[0]);
    }
    // eslint-disable-next-line
  }, []);

  // Save vehicles to guest profile
  const updateVehicles = (updatedVehicles) => {
    setVehicles(updatedVehicles);
    saveGuestVehicles(updatedVehicles);
  };

  const handleAddVehicle = (vehicleData) => {
    const newVehicle = {
      id: Date.now().toString(),
      ...vehicleData,
      createdAt: new Date().toISOString()
    };
    const updatedVehicles = [...vehicles, newVehicle];
    updateVehicles(updatedVehicles);
    onVehicleSelect(newVehicle);
    setShowModal(false);
  };

  const handleEditVehicle = (vehicleData) => {
    const updatedVehicles = vehicles.map(v =>
      v.id === editingVehicle.id ? { ...v, ...vehicleData } : v
    );
    updateVehicles(updatedVehicles);
    const updated = updatedVehicles.find(v => v.id === editingVehicle.id);
    onVehicleSelect(updated);
    setEditingVehicle(null);
    setShowModal(false);
  };

  const handleDeleteVehicle = (vehicleId) => {
    if (window.confirm('Delete this vehicle?')) {
      const updatedVehicles = vehicles.filter(v => v.id !== vehicleId);
      updateVehicles(updatedVehicles);
      if (selectedVehicleId === vehicleId && updatedVehicles.length > 0) {
        onVehicleSelect(updatedVehicles[0]);
      }
    }
  };

  const getVehicleIcon = (type) => {
    const icons = {
      standard: '🚗',
      resident: '🏠',
      disabled: '♿',
      electric: '⚡',
      motorcycle: '🏍️'
    };
    return icons[type] || '🚗';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-700">🚗 Your Vehicles</span>
        <span className="text-xs font-semibold text-gray-500">{userDisplayName}</span>
        {!isRegisteredUser() && vehicles.length > 0 && (
          <button
            onClick={onOpenAuth}
            className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ml-2"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            Sign up to sync
          </button>
        )}
      </div>
      <div className="space-y-3">
        {vehicles.map(vehicle => (
            <div
            key={vehicle.id}
            className={`border-2 rounded-xl p-4 flex items-center justify-between shadow-soft cursor-pointer transition-all duration-100 ${
                vehicle.id === selectedVehicleId
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
            }`}
            onClick={() => onVehicleSelect(vehicle)}
            style={{ userSelect: 'none' }}
            >
            <div className="flex items-center gap-3">
                <span className="text-3xl">{getVehicleIcon(vehicle.type)}</span>
                <div>
                <div className="font-bold">{vehicle.licensePlate}</div>
                <div className="flex gap-2">
                    {vehicle.type === 'resident' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">TLV Resident</span>
                    )}
                    {vehicle.isElectric && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Electric</span>
                    )}
                </div>
                </div>
            </div>
            <button
                title="Edit Vehicle"
                onClick={e => {
                e.stopPropagation();
                setEditingVehicle(vehicle);
                setShowModal(true);
                }}
                className="text-gray-400 hover:text-primary-600"
            >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
            </button>
            </div>
        ))}
        {/* Always visible Add Vehicle button, styled */}
        <button
            className="w-full p-4 border-2 border-dashed border-primary-300 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all duration-200 text-primary-600 font-semibold flex items-center justify-center gap-2"
            onClick={() => {
            setEditingVehicle(null);
            setShowModal(true);
            }}
        >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Vehicle
        </button>
        </div>
      {/* Add/Edit Vehicle Modal */}
      {showModal && (
        <VehicleModal
          vehicle={editingVehicle}
          onSave={editingVehicle ? handleEditVehicle : handleAddVehicle}
          onDelete={editingVehicle ? () => handleDeleteVehicle(editingVehicle.id) : null}
          onClose={() => {
            setShowModal(false);
            setEditingVehicle(null);
          }}
        />
      )}
    </div>
  );
};


// ======= VehicleModal remains the same as your version =======

const VehicleModal = ({ vehicle, onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState({
    licensePlate: vehicle?.licensePlate || '',
    type: vehicle?.type || 'standard',
    isElectric: vehicle?.isElectric || false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.licensePlate.trim()) {
      alert('Please enter a license plate');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            {vehicle ? 'Edit Vehicle' : 'Add Vehicle'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* License Plate */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              License Plate
            </label>
            <input
              type="text"
              value={formData.licensePlate}
              onChange={e => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
              placeholder="12-345-67"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 font-semibold text-lg text-center"
              maxLength={10}
            />
          </div>
          {/* Vehicle Type */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Vehicle Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'standard', label: 'Standard', icon: '🚗' },
                { value: 'resident', label: 'TLV Resident', icon: '🏠' },
                { value: 'disabled', label: 'Disabled', icon: '♿' },
                { value: 'motorcycle', label: 'Motorcycle', icon: '🏍️' },
              ].map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value })}
                  className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                    formData.type === type.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-xs font-semibold">{type.label}</div>
                </button>
              ))}
            </div>
          </div>
          {/* Electric Vehicle */}
          <div>
            <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={formData.isElectric}
                onChange={e => setFormData({ ...formData, isElectric: e.target.checked })}
                className="w-5 h-5 text-primary-600"
              />
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span className="font-semibold text-gray-900">Electric Vehicle</span>
              </div>
            </label>
          </div>
          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 gradient-primary text-white font-bold rounded-xl shadow-medium hover:shadow-large transition-all"
            >
              {vehicle ? 'Save' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleSelector;
