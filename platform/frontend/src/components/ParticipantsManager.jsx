import React, { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiX, FiCheck, FiSearch, FiUserPlus } from "react-icons/fi";
import { RiSearchLine } from "react-icons/ri";

const ParticipantsManager = ({ ataId, municipioId }) => {
  const [participants, setParticipants] = useState([]);
  const [allParticipants, setAllParticipants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState({});

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

  // Fetch participants for this ata
  useEffect(() => {
    if (ataId) {
      fetchAtaParticipants();
    }
  }, [ataId]);

  // Load all participants when form is shown
  useEffect(() => {
    if (showForm) {
      fetchParticipants();
    }
  }, [showForm]);

  // Filter participants when search changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredParticipants(allParticipants.filter(
        (p) => !participants.some((existing) => existing.id === p.id)
      ));
    } else {
      const filtered = allParticipants
        .filter((p) => !participants.some((existing) => existing.id === p.id))
        .filter((p) => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.role && p.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.coalition && p.coalition.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      setFilteredParticipants(filtered);
    }
  }, [searchQuery, allParticipants, participants]);

  const showMessage = (text, type = "error") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 5000); // Auto-hide message after 5 seconds
  };

  const fetchAtaParticipants = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/atas/${ataId}/participantes?demo=${DEMO_MODE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setParticipants(data);
      } else {
        showMessage(data.error || "Erro ao obter participantes.", "error");
      }
    } catch (error) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/participantes/municipio/${municipioId}?demo=${DEMO_MODE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAllParticipants(data);
        setFilteredParticipants(data.filter(
          (p) => !participants.some((existing) => existing.id === p.id)
        ));
      } else {
        showMessage(data.error || "Erro ao obter lista de participantes.", "error");
      }
    } catch (error) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedParticipantId("");
    setShowForm(false);
    setSearchQuery("");
    setLoadingParticipants({});
  };

  const handleAddParticipant = async (participantId) => {
    if (!participantId) {
      showMessage("Participante inválido", "error");
      return;
    }

    // Set loading state for this specific participant
    setLoadingParticipants(prev => ({ ...prev, [participantId]: true }));

    try {
      const res = await fetch(`${API_URL}/atas/${ataId}/participantes?demo=${DEMO_MODE}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participante_id: participantId
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        fetchAtaParticipants(); // Refresh the list
        showMessage("Participante adicionado com sucesso.", "success");
      } else {
        showMessage(data.error || "Erro ao adicionar participante.", "error");
      }
    } catch (error) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setLoadingParticipants(prev => ({ ...prev, [participantId]: false }));
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    if (!window.confirm("Tem certeza que deseja remover este participante?")) return;

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/atas/${ataId}/participantes/${participantId}?demo=${DEMO_MODE}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        // Update local state to remove the participante
        setParticipants(participants.filter(p => p.id !== participantId));
        showMessage("Participante removido com sucesso.", "success");
      } else {
        const data = await res.json();
        showMessage(data.error || "Erro ao remover participante.", "error");
      }
    } catch (error) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6">
      {/* Header with responsive button */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-4">
        <h3 className="text-lg font-medium text-gray-900">Participantes da Ata</h3>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="inline-flex items-center justify-center text-sky-600 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-md transition-colors duration-200 text-sm w-full xs:w-auto"
        >
          {showForm ? (
            <>
              <FiX className="w-4 h-4 mr-1.5" />
              Cancelar
            </>
          ) : (
            <>
              <FiPlus className="w-4 h-4 mr-1.5" />
              Adicionar Participante
            </>
          )}
        </button>
      </div>

      {/* Message display */}
      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            messageType === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Form for adding participants - Responsive */}
      {showForm && (
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Adicionar Participante
          </h4>
          
          {/* Search Input */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Pesquisar participantes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <RiSearchLine className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          {/* Participant List with Add Button */}
          <div className="space-y-2 max-h-60 overflow-y-auto p-1">
            {filteredParticipants.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                {searchQuery ? "Nenhum participante encontrado" : "Todos os participantes já foram adicionados"}
              </p>
            ) : (
              filteredParticipants.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="h-8 w-8 flex-shrink-0 mr-3">
                      {p.imageUrl ? (
                        <img 
                          className="h-8 w-8 rounded-sm object-cover" 
                          src={p.imageUrl} 
                          alt={p.name} 
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-sm bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-medium">
                            {p.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {p.role || "Sem cargo"} {p.coalition ? `- ${p.coalition}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddParticipant(p.id)}
                    disabled={loadingParticipants[p.id]}
                    className="ml-2 inline-flex items-center justify-center px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingParticipants[p.id] ? (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <>
                        <FiUserPlus className="w-3.5 h-3.5 mr-1" />
                        Adicionar
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Available participants count */}
          <p className="mt-3 text-xs text-gray-500">
            {filteredParticipants.length} participantes disponíveis
            {searchQuery ? ` para "${searchQuery}"` : ""}
          </p>
          
          <div className="flex justify-end mt-3">
            <button
              onClick={resetForm}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FiX className="w-4 h-4 mr-1.5" />
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !showForm ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-700"></div>
        </div>
      ) : participants.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">Nenhum participante associado a esta ata.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Hide ID on mobile */}
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  {/* Always visible */}
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participante
                  </th>
                  {/* Hide on small mobile */}
                  <th className="hidden xs:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Função
                  </th>
                  {/* Hide on mobile */}
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coligação
                  </th>
                  {/* Always visible */}
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {participants.map((participante) => (
                  <tr key={participante.id} className="hover:bg-gray-50">
                    {/* ID - Hidden on mobile */}
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-mono text-gray-500 tracking-wider">
                      {participante.id}
                    </td>
                    
                    {/* Participant with Image - Include role and coalition for mobile */}
                    <td className="px-3 sm:px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 mr-3">
                          {participante.imageUrl ? (
                            <img 
                              className="h-10 w-10 rounded-sm object-cover" 
                              src={participante.imageUrl} 
                              alt={participante.name} 
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-sm bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 font-medium">
                                {participante.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[130px] sm:max-w-[200px]">
                            {participante.name}
                          </div>
                          
                          {/* Mobile only info */}
                          <div className="xs:hidden text-xs text-gray-500 mt-1 truncate max-w-[130px]">
                            {participante.role || "Sem cargo"}
                          </div>
                          <div className="sm:hidden text-xs text-gray-500 mt-0.5 truncate max-w-[130px]">
                            {participante.coalition || "-"}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Role - Hidden on small mobile */}
                    <td className="hidden xs:table-cell px-3 sm:px-6 py-4 text-sm text-gray-500">
                      <div className="truncate max-w-[100px] sm:max-w-[150px]">
                        {participante.role || <span className="text-gray-400 italic">Não definido</span>}
                      </div>
                    </td>
                    
                    {/* Coalition - Hidden on mobile */}
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-sm text-gray-500">
                      <div className="truncate max-w-[150px]">
                        {participante.coalition || <span className="text-gray-400 italic">Não definido</span>}
                      </div>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleRemoveParticipant(participante.id)}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md text-xs transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiTrash2 className="w-3.5 h-3.5 mr-1" />
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantsManager;