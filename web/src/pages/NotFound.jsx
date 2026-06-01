import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center mb-6">
          <FiAlertTriangle className="text-orange-500 text-3xl" />
        </div>
        <h1 className="text-5xl font-bold text-gray-900">404</h1>
        <p className="text-xl text-gray-700 mt-2">Page not found</p>
        <p className="text-gray-500 mt-2">The page you're looking for does not exist or has been moved.</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2 mt-6">
          <FiArrowLeft /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
