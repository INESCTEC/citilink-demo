import React, { createContext, useContext, useState } from "react";

const LastSeenContext = createContext();

export const LastSeenProvider = ({ children }) => {
  const [lastSeen, setLastSeen] = useState({
    minute: null,
    subject: null,
  });

  const markAsLastSeen = (type, id) => {
    setLastSeen((prev) => ({ ...prev, [type]: id }));
  };

  return (
    <LastSeenContext.Provider value={{ lastSeen, markAsLastSeen }}>
      {children}
    </LastSeenContext.Provider>
  );
};

export const useLastSeenGlobal = () => useContext(LastSeenContext);
