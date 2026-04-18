import React, { useState } from 'react';
import './NearbyWorkersModal.css';

const ServiceEstimatorModal = ({ isOpen, onClose, service }) => {
  const [floors, setFloors] = useState(1);
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(2);
  const [areaSqft, setAreaSqft] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  const [result, setResult] = useState(null);

  if (!isOpen || !service) return null;

  const serviceId = service.id;
  const serviceLabel = service.label;

  const getWorkerLabel = () => {
    switch (serviceId) {
      case 'painting':
        return 'Painter';
      case 'electrical':
        return 'Electrician';
      case 'plumbing':
        return 'Plumber';
      case 'carpentry':
        return 'Carpenter';
      case 'construction':
        return 'Construction Worker';
      default:
        return 'Worker';
    }
  };

  const handleCalculate = (e) => {
    e.preventDefault();

    const parsedArea = parseFloat(areaSqft) || 0;

    let estimatedArea = parsedArea;
    if (!parsedArea) {
      estimatedArea = floors * 800 + bedrooms * 120 + bathrooms * 80;
    }

    if (estimatedArea <= 0) {
      estimatedArea = 600;
    }

    let complexityMultiplier = 1;
    let dailyCapacityPerWorker = 350;

    if (serviceId === 'painting') {
      complexityMultiplier = 1.0;
      dailyCapacityPerWorker = 350;
    } else if (serviceId === 'electrical') {
      complexityMultiplier = 0.8;
      dailyCapacityPerWorker = 220;
    } else if (serviceId === 'plumbing' || serviceId === 'masonry' || serviceId === 'tiling') {
      complexityMultiplier = 1.1;
      dailyCapacityPerWorker = 260;
    }

    const targetDays = durationDays > 0 ? durationDays : 3;

    const totalWorkUnits = estimatedArea * complexityMultiplier;
    const workersNeeded = Math.max(1, Math.ceil(totalWorkUnits / (dailyCapacityPerWorker * targetDays)));

    const supervisorCount = Math.max(1, Math.ceil(workersNeeded / 5));

    const teams = [];
    let remainingWorkers = workersNeeded;

    for (let i = 0; i < supervisorCount; i++) {
      const workersInTeam = Math.min(4, remainingWorkers);
      teams.push({
        supervisorNumber: i + 1,
        workersInTeam
      });
      remainingWorkers -= workersInTeam;
      if (remainingWorkers <= 0) break;
    }

    const workerLabel = getWorkerLabel();

    setResult({
      estimatedArea,
      workersNeeded,
      supervisorCount,
      teams,
      workerLabel,
      targetDays
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>📐 {serviceLabel} Manpower Estimator</h2>
            <p className="modal-subtitle">
              Enter your house details and we will suggest how many people are required for this work.
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '2rem 2.5rem' }}>
          <form className="estimator-form" onSubmit={handleCalculate}>
            <div className="estimator-grid">
              <div className="field-group">
                <label>Number of Floors</label>
                <input
                  type="number"
                  min="1"
                  value={floors}
                  onChange={(e) => setFloors(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="field-group">
                <label>Bedrooms</label>
                <input
                  type="number"
                  min="0"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="field-group">
                <label>Bathrooms</label>
                <input
                  type="number"
                  min="0"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="field-group">
                <label>Total Area (sq.ft)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Optional if you know exact area"
                  value={areaSqft}
                  onChange={(e) => setAreaSqft(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>Target Completion Time (days)</label>
                <input
                  type="number"
                  min="1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value) || 3)}
                />
              </div>
            </div>

            <div className="estimator-actions">
              <button type="submit" className="btn-hire">
                Calculate Recommended Team
              </button>
            </div>
          </form>

          {result && (
            <div className="estimator-result">
              <h3>Recommended Team</h3>
              <p>
                For approximately <strong>{result.estimatedArea.toFixed(0)} sq.ft</strong> in{' '}
                <strong>{result.targetDays} days</strong>, we recommend:
              </p>

              <ul>
                <li>
                  <strong>{result.supervisorCount}</strong> Senior {result.workerLabel} Supervisor
                  {result.supervisorCount > 1 ? 's' : ''}
                </li>
                <li>
                  <strong>{result.workersNeeded}</strong> {result.workerLabel}s in total
                </li>
              </ul>

              <div className="teams-breakdown">
                <h4>Suggested Grouping</h4>
                {result.teams.map((team) => (
                  <p key={team.supervisorNumber}>
                    Team {team.supervisorNumber}: 1 Senior Supervisor + {team.workersInTeam} {result.workerLabel}
                    {team.workersInTeam !== 1 ? 's' : ''}
                  </p>
                ))}
              </div>

              <p className="note-text">
                This is an approximate recommendation. Actual requirement may change based on site condition and design.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceEstimatorModal;
