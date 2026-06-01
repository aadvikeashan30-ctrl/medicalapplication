import React from 'react';

export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-gray-500">
      <span className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
