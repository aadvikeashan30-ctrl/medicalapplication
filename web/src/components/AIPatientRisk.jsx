import React, { useState } from 'react';
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiLoader, FiShield } from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';
import api from '../utils/api';

const riskColors = {
  low: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  moderate: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500' },
  high: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500' },
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', bar: 'bg-red-500' }
};

export default function AIPatientRisk({ patient }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const assessRisk = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/ai/risk-score', {
        patient: {
          name: patient?.name,
          age: patient?.age,
          gender: patient?.gender,
          bloodGroup: patient?.bloodGroup,
          allergies: patient?.allergies
        },
        visits: patient?.totalVisits || 0,
        conditions: patient?.medicalHistory || []
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Risk assessment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!patient) return null;

  const colors = riskColors[result?.riskLevel] || riskColors.low;
  const scorePercent = result ? (result.riskScore / 10) * 100 : 0;

  return (
    <div className="space-y-3">
      {!result && (
        <button
          onClick={assessRisk}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl text-violet-700 font-medium text-sm hover:from-violet-100 hover:to-indigo-100 transition-all disabled:opacity-50"
        >
          {loading ? (
            <><FiLoader className="animate-spin" /> Analyzing patient risk...</>
          ) : (
            <><FaRobot /> <FiShield /> AI Risk Assessment</>
          )}
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
          <FiAlertTriangle /> {error}
        </div>
      )}

      {result && (
        <div className={`${colors.bg} ${colors.border} border rounded-2xl p-4 space-y-4 animate-fade-in`}>
          {/* Score header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                <span className={`text-xl font-bold ${colors.text}`}>{result.riskScore}</span>
              </div>
              <div>
                <p className={`font-bold ${colors.text} capitalize`}>{result.riskLevel} Risk</p>
                <p className="text-xs text-gray-500">Score: {result.riskScore}/10</p>
              </div>
            </div>
            <button
              onClick={assessRisk}
              disabled={loading}
              className="text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              Reassess
            </button>
          </div>

          {/* Score bar */}
          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.bar} rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>

          {/* Risk factors */}
          {result.factors?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1.5 flex items-center gap-1">
                <FiAlertTriangle className="text-amber-500" /> Risk Factors
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.factors.map((f, i) => (
                  <span key={i} className="text-xs bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1.5 flex items-center gap-1">
                <FiCheckCircle className="text-emerald-500" /> Recommendations
              </p>
              <div className="space-y-1.5">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 flex-shrink-0" />
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No-show prediction */}
          {result.predictedNoShowProbability > 0 && (
            <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
              <div className="flex items-center gap-2">
                <FiActivity className="text-blue-500" />
                <span className="text-sm text-gray-700">No-show probability</span>
              </div>
              <span className={`font-bold text-sm ${result.predictedNoShowProbability > 20 ? 'text-orange-600' : 'text-emerald-600'}`}>
                {result.predictedNoShowProbability}%
              </span>
            </div>
          )}

          {/* Follow-up suggestion */}
          {result.suggestedFollowUp && (
            <div className="flex items-center gap-2 text-sm text-violet-700 bg-violet-50 rounded-xl p-3 border border-violet-100">
              <FiActivity />
              Suggested follow-up: <strong>{result.suggestedFollowUp}</strong>
            </div>
          )}

          <p className="text-[11px] text-gray-400 italic">
            ⚠️ AI assessment ({result.provider || 'demo'}) — for clinical decision support only.
          </p>
        </div>
      )}
    </div>
  );
}
