import React, { useState, useEffect } from "react";
import { FiPlus, FiEdit, FiTrash2, FiX, FiCheck, FiUserPlus, FiThumbsUp, FiThumbsDown, FiUser } from "react-icons/fi";

const AssuntosManager = ({ ataId, municipioId }) => {
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

  const [assuntos, setAssuntos] = useState([]);
  const [topicos, setTopicos] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    topico_id: "",
    votos_favor: 0,
    votos_contra: 0,
    abstencoes: 0,
    aprovado: true,
    votos: [] // Array of individual votes
  });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [showVotingSection, setShowVotingSection] = useState(false);
  const [selectedVoto, setSelectedVoto] = useState({
    participante_id: "",
    tipo: "favor",
    justificativa: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL;

  // Fetch assuntos for this ata
  useEffect(() => {
    if (ataId) {
      fetchAssuntos();
      fetchTopicos();
      fetchAtaParticipantes();
    }
  }, [ataId]);

  const fetchAssuntos = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/atas/${ataId}/assuntos?demo=${DEMO_MODE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAssuntos(data);
      } else {
        showMessage(data.error || "Erro ao obter assuntos.", "error");
      }
    } catch (error) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTopicos = async () => {
    try {
      const response = await fetch(`${API_URL}/municipios/${municipioId}/topicos?demo=${DEMO_MODE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTopicos(data);
      } else {
        console.error("Failed to fetch topicos for municipio");
      }
    } catch (error) {
      console.error("Error fetching topicos:", error);
    }
  };

  // New method to fetch participants specifically for this ata
  const fetchAtaParticipantes = async () => {
    try {
      const response = await fetch(`${API_URL}/atas/${ataId}/participantes?demo=${DEMO_MODE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setParticipantes(data);
        
        // Set default participante if available
        if (data.length > 0 && !selectedVoto.participante_id) {
          setSelectedVoto(prev => ({
            ...prev,
            participante_id: data[0].id
          }));
        }
      } else {
        console.error("Failed to fetch participants for this ata");
        showMessage("Erro ao carregar participantes da ata.", "error");
      }
    } catch (error) {
      console.error("Error fetching ata participants:", error);
      showMessage("Erro de conexão ao procurar participantes.", "error");
    }
  };

  const showMessage = (text, type = "error") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
    }, 5000); // Auto-hide message after 5 seconds
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleVotoChange = (e) => {
    const { name, value } = e.target;
    setSelectedVoto({ ...selectedVoto, [name]: value });
  };

  const handleVoteSummaryChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: parseInt(value, 10) || 0,
      // Auto-recalculate approval status
      aprovado: name === "votos_favor" 
        ? parseInt(value, 10) > formData.votos_contra 
        : name === "votos_contra" 
          ? formData.votos_favor > parseInt(value, 10)
          : formData.votos_favor > formData.votos_contra
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      topico_id: topicos.length > 0 ? topicos[0].id : "",
      votos_favor: 0,
      votos_contra: 0,
      abstencoes: 0,
      aprovado: true,
      votos: []
    });
    setSelectedVoto({
      participante_id: participantes.length > 0 ? participantes[0].id : "",
      tipo: "favor",
      justificativa: ""
    });
    setEditingId(null);
    setShowForm(false);
    setShowVotingSection(false);
  };

  // Add a vote to the current form data
  const handleAddVoto = (votoData = null) => {
    // Use the passed voto data or fall back to the state
    const votoToAdd = votoData || selectedVoto;
    
    if (!votoToAdd.participante_id) {
      showMessage("Selecione um participante para o voto", "error");
      return;
    }
  
    // Check if this participant already has a vote
    const existingVoteIndex = formData.votos.findIndex(
      v => v.participante_id === votoToAdd.participante_id
    );
  
    let newVotos = [...formData.votos];
    
    // If participant already voted, update their vote
    if (existingVoteIndex >= 0) {
      newVotos[existingVoteIndex] = { ...votoToAdd };
    } else {
      // Otherwise add a new vote
      newVotos.push({ ...votoToAdd });
    }
  
    // Recalculate vote totals
    const votos_favor = newVotos.filter(v => v.tipo === "favor").length;
    const votos_contra = newVotos.filter(v => v.tipo === "contra").length;
    const abstencoes = newVotos.filter(v => v.tipo === "abstencao").length;
    
    // Item is approved if there are more votes in favor than against
    const aprovado = votos_favor > votos_contra;
  
    setFormData({
      ...formData,
      votos: newVotos,
      votos_favor,
      votos_contra,
      abstencoes,
      aprovado
    });
  
    // Reset selected participant (but keep the vote type)
    const currentTipo = votoToAdd.tipo;
    setSelectedVoto({
      participante_id: "",
      tipo: currentTipo,
      justificativa: ""
    });
  };

  // Remove a vote from the current form data
  const handleRemoveVoto = (participanteId) => {
    const newVotos = formData.votos.filter(v => v.participante_id !== participanteId);
    
    // Recalculate vote totals
    const votos_favor = newVotos.filter(v => v.tipo === "favor").length;
    const votos_contra = newVotos.filter(v => v.tipo === "contra").length;
    const abstencoes = newVotos.filter(v => v.tipo === "abstencao").length;
    
    // Item is approved if there are more votes in favor than against
    const aprovado = votos_favor > votos_contra;

    setFormData({
      ...formData,
      votos: newVotos,
      votos_favor,
      votos_contra,
      abstencoes,
      aprovado
    });
  };

  // Create a new assunto
  const handleCreateAssunto = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/atas/${ataId}/assuntos?demo=${DEMO_MODE}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        fetchAssuntos(); // Refresh the list
        resetForm();
        showMessage("Assunto adicionado com sucesso.", "success");
      } else {
        showMessage(data.error || "Erro ao criar assunto.", "error");
      }
    } catch (error) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing assunto
  const handleUpdateAssunto = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/atas/${ataId}/assuntos/${editingId}?demo=${DEMO_MODE}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        fetchAssuntos(); // Refresh the list
        resetForm();
        showMessage("Assunto atualizado com sucesso.", "success");
      } else {
        showMessage(data.error || "Erro ao atualizar assunto.", "error");
      }
    } catch (error) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete an assunto
  const handleDeleteAssunto = async (assuntoId) => {
    if (!window.confirm("Tem certeza que deseja apagar este assunto?")) return;

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/atas/${ataId}/assuntos/${assuntoId}?demo=${DEMO_MODE}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        fetchAssuntos(); // Refresh the list
        showMessage("Assunto apagado com sucesso.", "success");
      } else {
        const data = await res.json();
        showMessage(data.error || "Erro ao apagar assunto.", "error");
      }
    } catch (error) {
      showMessage("Erro de conexão.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Open edit form with pre-filled data
  const openEditForm = (assunto) => {
    setFormData({
      title: assunto.title,
      description: assunto.description || "",
      topico_id: assunto.topico_id,
      votos_favor: assunto.votos_favor || 0,
      votos_contra: assunto.votos_contra || 0,
      abstencoes: assunto.abstencoes || 0,
      aprovado: assunto.aprovado !== undefined ? assunto.aprovado : true,
      votos: assunto.votos || []
    });
    setEditingId(assunto.id);
    setShowForm(true);
    setShowVotingSection(assunto.votos && assunto.votos.length > 0);
  };

  // Find topico title by id
  const getTopicoTitle = (topicoId) => {
    const topico = topicos.find(p => p.id === topicoId);
    return topico ? topico.title : "Topico não encontrado";
  };

  // Find participant name by id
  const getParticipantName = (participanteId) => {
    const participante = participantes.find(p => p.id === participanteId);
    return participante ? participante.name : "Participante não encontrado";
  };

  return (
    <div className="mt-6">
      {/* Header with responsive button */}
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-4">
        <h3 className="text-lg font-medium text-gray-900">Assuntos da Ata</h3>
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
              Adicionar Assunto
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

      {/* Form for creating/editing assuntos - Responsive */}
      {showForm && (
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {editingId ? "Editar Assunto" : "Novo Assunto"}
          </h4>
          <form onSubmit={editingId ? handleUpdateAssunto : handleCreateAssunto} className="space-y-3">
            {/* Grid layout for form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Título<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Título do assunto"
                />
              </div>

              <div>
                <label htmlFor="topico_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Topico<span className="text-red-500">*</span>
                </label>
                <select
                  id="topico_id"
                  name="topico_id"
                  value={formData.topico_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um topico</option>
                  {topicos.map((topico) => (
                    <option key={topico.id} value={topico.id}>
                      {topico.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descrição detalhada (opcional)"
              />
            </div>

            {/* Voting Section Toggle */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setShowVotingSection(!showVotingSection)}
                className="text-sm text-sky-700 font-medium flex items-center"
              >
                {showVotingSection ? (
                  <>
                    <FiX className="mr-1.5" />
                    Ocultar Informações de Votação
                  </>
                ) : (
                  <>
                    <FiPlus className="mr-1.5" />
                    Adicionar Informações de Votação
                  </>
                )}
              </button>
            </div>
            
            {/* Voting Information Section - Responsive */}
            {showVotingSection && (
              <div className="border border-gray-200 rounded-md p-3 sm:p-4 bg-white">
                <h5 className="text-sm font-medium text-gray-700 mb-3">
                  Votação
                </h5>
                
                {participantes.length === 0 ? (
                  <div className="bg-amber-50 p-3 rounded-md text-center text-amber-800 text-sm mb-4">
                    Não há participantes registrados nesta ata. 
                    Adicione participantes à ata antes de registrar votos.
                  </div>
                ) : (
                  <>
                    {/* Simplified voting interface */}
                    <div className="grid grid-cols-1 gap-4">
                      {/* Vote summary */}
                      <div className="bg-gray-50 p-3 rounded-md flex justify-around">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">A favor</div>
                          <div className="text-2xl font-bold text-green-600">{formData.votos_favor}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Contra</div>
                          <div className="text-2xl font-bold text-red-600">{formData.votos_contra}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Abstenções</div>
                          <div className="text-2xl font-bold text-gray-500">{formData.abstencoes}</div>
                        </div>
                      </div>
                      
                      <div className="text-center mb-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          formData.aprovado 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {formData.aprovado ? "Aprovado" : "Reprovado"}
                        </span>
                      </div>
                      
                      {/* Quick vote add form */}
                      <div className="flex flex-col md:flex-row gap-2 p-3 border border-gray-200 rounded-md bg-white">
  <select
    name="participante_id"
    value={selectedVoto.participante_id}
    onChange={handleVotoChange}
    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
  >
    <option value="">Selecione um participante</option>
    {participantes
      .filter(p => !formData.votos.some(v => v.participante_id === p.id))
      .map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} {p.role ? `(${p.role})` : ''}
        </option>
      ))}
  </select>
  
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => {
        // Create a completely new vote object to avoid reference issues
        const newVoto = {
          participante_id: selectedVoto.participante_id,
          tipo: "favor",
          justificativa: selectedVoto.justificativa || ""
        };
        
        if (!newVoto.participante_id) {
          showMessage("Selecione um participante para o voto", "error");
          return;
        }
        
        // Update votes array directly
        const existingVoteIndex = formData.votos.findIndex(
          v => v.participante_id === newVoto.participante_id
        );
        
        let newVotos = [...formData.votos];
        
        if (existingVoteIndex >= 0) {
          newVotos[existingVoteIndex] = newVoto;
        } else {
          newVotos.push(newVoto);
        }
        
        // Recalculate vote totals
        const votos_favor = newVotos.filter(v => v.tipo === "favor").length;
        const votos_contra = newVotos.filter(v => v.tipo === "contra").length;
        const abstencoes = newVotos.filter(v => v.tipo === "abstencao").length;
        
        // Item is approved if there are more votes in favor than against
        const aprovado = votos_favor > votos_contra;
        
        // Update form data directly
        setFormData({
          ...formData,
          votos: newVotos,
          votos_favor,
          votos_contra,
          abstencoes,
          aprovado
        });
        
        // Reset selected participant
        setSelectedVoto({
          participante_id: "",
          tipo: "favor",
          justificativa: ""
        });
      }}
      className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 transition-colors flex items-center justify-center"
      disabled={!selectedVoto.participante_id}
    >
      <FiThumbsUp className="mr-1.5" /> A favor
    </button>
    
    <button
      type="button"
      onClick={() => {
        // Create a completely new vote object to avoid reference issues
        const newVoto = {
          participante_id: selectedVoto.participante_id,
          tipo: "contra",
          justificativa: selectedVoto.justificativa || ""
        };
        
        if (!newVoto.participante_id) {
          showMessage("Selecione um participante para o voto", "error");
          return;
        }
        
        // Update votes array directly
        const existingVoteIndex = formData.votos.findIndex(
          v => v.participante_id === newVoto.participante_id
        );
        
        let newVotos = [...formData.votos];
        
        if (existingVoteIndex >= 0) {
          newVotos[existingVoteIndex] = newVoto;
        } else {
          newVotos.push(newVoto);
        }
        
        // Recalculate vote totals
        const votos_favor = newVotos.filter(v => v.tipo === "favor").length;
        const votos_contra = newVotos.filter(v => v.tipo === "contra").length;
        const abstencoes = newVotos.filter(v => v.tipo === "abstencao").length;
        
        // Item is approved if there are more votes in favor than against
        const aprovado = votos_favor > votos_contra;
        
        // Update form data directly
        setFormData({
          ...formData,
          votos: newVotos,
          votos_favor,
          votos_contra,
          abstencoes,
          aprovado
        });
        
        // Reset selected participant
        setSelectedVoto({
          participante_id: "",
          tipo: "contra",
          justificativa: ""
        });
      }}
      className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm hover:bg-red-700 transition-colors flex items-center justify-center"
      disabled={!selectedVoto.participante_id}
    >
      <FiThumbsDown className="mr-1.5" /> Contra
    </button>
    
    <button
      type="button"
      onClick={() => {
        // Create a completely new vote object to avoid reference issues
        const newVoto = {
          participante_id: selectedVoto.participante_id,
          tipo: "abstencao",
          justificativa: selectedVoto.justificativa || ""
        };
        
        if (!newVoto.participante_id) {
          showMessage("Selecione um participante para o voto", "error");
          return;
        }
        
        // Update votes array directly
        const existingVoteIndex = formData.votos.findIndex(
          v => v.participante_id === newVoto.participante_id
        );
        
        let newVotos = [...formData.votos];
        
        if (existingVoteIndex >= 0) {
          newVotos[existingVoteIndex] = newVoto;
        } else {
          newVotos.push(newVoto);
        }
        
        // Recalculate vote totals
        const votos_favor = newVotos.filter(v => v.tipo === "favor").length;
        const votos_contra = newVotos.filter(v => v.tipo === "contra").length;
        const abstencoes = newVotos.filter(v => v.tipo === "abstencao").length;
        
        // Item is approved if there are more votes in favor than against
        const aprovado = votos_favor > votos_contra;
        
        // Update form data directly
        setFormData({
          ...formData,
          votos: newVotos,
          votos_favor,
          votos_contra,
          abstencoes,
          aprovado
        });
        
        // Reset selected participant
        setSelectedVoto({
          participante_id: "",
          tipo: "abstencao",
          justificativa: ""
        });
      }}
      className="flex-1 bg-gray-500 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-600 transition-colors flex items-center justify-center"
      disabled={!selectedVoto.participante_id}
    >
      <FiUser className="mr-1.5" /> Abst.
    </button>
  </div>
</div>
                      
                      {/* Votes list */}
                      {formData.votos.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium text-gray-700 mb-2">Votos Registrados</h6>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {formData.votos.map((voto, index) => (
                              <div 
                                key={index} 
                                className={`flex items-center justify-between p-2 rounded-md ${
                                  voto.tipo === "favor" 
                                    ? "bg-green-50 border-l-4 border-green-500" 
                                    : voto.tipo === "contra" 
                                      ? "bg-red-50 border-l-4 border-red-500" 
                                      : "bg-gray-50 border-l-4 border-gray-500"
                                }`}
                              >
                                <div className="flex items-center overflow-hidden">
                                  <span className={`flex-shrink-0 mr-2 ${
                                    voto.tipo === "favor" 
                                      ? "text-green-600" 
                                      : voto.tipo === "contra" 
                                        ? "text-red-600" 
                                        : "text-gray-600"
                                  }`}>
                                    {voto.tipo === "favor" ? <FiThumbsUp /> : voto.tipo === "contra" ? <FiThumbsDown /> : <FiUser />}
                                  </span>
                                  <div className="overflow-hidden">
                                    <div className="text-sm font-medium truncate">{getParticipantName(voto.participante_id)}</div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVoto(voto.participante_id)}
                                  className="text-gray-500 hover:text-red-600 flex-shrink-0 ml-2"
                                >
                                  <FiX size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {editingId ? "A atualizar..." : "A Guardar..."}
                  </>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4 mr-1.5" />
                    {editingId ? "Atualizar" : "Guardar"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !showForm && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-700"></div>
        </div>
      )}

      {/* Assuntos list - Responsive Table */}
      {!isLoading && assuntos.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">Nenhum assunto encontrado para esta ata.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Hide on mobile */}
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  {/* Always visible */}
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="hidden xs:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Topico
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Votação
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assuntos.map((assunto) => (
                  <tr key={assunto.id} className="hover:bg-gray-50">
                    {/* ID - Hidden on mobile */}
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-mono text-gray-500 tracking-wider">
                      {assunto.id}
                    </td>
                    
                    {/* Title - Show topico on mobile */}
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="truncate max-w-[150px] sm:max-w-xs">
                        {assunto.title}
                        
                        {/* Mobile only info */}
                        <div className="xs:hidden text-xs text-gray-500 mt-0.5">
                          {getTopicoTitle(assunto.topico_id)}
                        </div>
                      </div>
                    </td>
                    
                    {/* Topico - Hidden on small mobile */}
                    <td className="hidden xs:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="truncate max-w-[100px] sm:max-w-xs">
                        {getTopicoTitle(assunto.topico_id)}
                      </div>
                    </td>
                    
                    {/* Description - Hidden on mobile */}
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-sm text-gray-500">
                      {assunto.description ? 
                        (assunto.description.length > 50 ? 
                          `${assunto.description.substring(0, 50)}...` : 
                          assunto.description) : 
                        <span className="text-gray-400 italic">Sem descrição</span>}
                    </td>
                    
                    {/* Voting Status */}
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                      {assunto.votos_favor > 0 || assunto.votos_contra > 0 || assunto.abstencoes > 0 ? (
                        <div>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            assunto.aprovado 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {assunto.aprovado ? "Aprovado" : "Reprovado"}
                          </span>
                          <div className="mt-1 text-xs text-gray-500">
                            <span className="text-green-600">{assunto.votos_favor} a favor</span> • 
                            <span className="text-red-600"> {assunto.votos_contra} contra</span> • 
                            <span className="text-gray-600"> {assunto.abstencoes} abs</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Sem votação</span>
                      )}
                    </td>
                    
                    {/* Actions - Stack on mobile */}
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col xs:flex-row gap-1.5">
                        <button
                          onClick={() => openEditForm(assunto)}
                          className="inline-flex items-center justify-center text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                        >
                          <FiEdit className="w-3.5 h-3.5 mr-1" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteAssunto(assunto.id)}
                          className="inline-flex items-center justify-center text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                        >
                          <FiTrash2 className="w-3.5 h-3.5 mr-1" />
                          Apagar
                        </button>
                      </div>
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

export default AssuntosManager;