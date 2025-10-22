import React from "react";
import GenericToast from "./GenericToast";

const ToastContainer = ({ toasts, onRemove }) => {
  // Stack toasts vertically, newest on top, pass stackIndex and timestamp
  return (
    <div className="fixed z-50 top-5 right-5 flex flex-col items-end pointer-events-none" style={{ minWidth: 320 }}>
      {toasts.map((toast, idx) => (
        <GenericToast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          show={true}
          onClose={() => onRemove(toast.id)}
          duration={toast.duration}
          position={toast.position}
          stackIndex={idx}
          timestamp={toast.timestamp}
          className="pointer-events-auto"
        />
      ))}
    </div>
  );
};

export default ToastContainer;