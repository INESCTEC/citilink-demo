// PartyColorMapper.js
const PARTY_COLORS = {
  "PS": "bg-rose-500/90 text-white", // Partido Socialista
  "PSD": "bg-orange-500 text-white", // Partido Social Democrata
  "CDS": "bg-sky-700 text-white", // CDS – Partido Popular
  "CDS-PP": "bg-sky-700 text-white", // CDS – Partido Popular
  "CDS/PSD": "bg-[linear-gradient(to_top,_#0369a1_15%,_#f97316_15%)] text-white", // CDS-PP/PSD 
  "CDS-PP/PSD": "bg-[linear-gradient(to_top,_#0369a1_15%,_#f97316_15%)] text-white", // CDS-PP/PSD 
  "PSD/CDS-PP": "bg-[linear-gradient(to_top,_#f97316_15%,_#0369a1_15%)] text-white", // PSD/CDS-PP
  "BE": "bg-fuchsia-700 text-white", // Bloco de Esquerda
  "PCP": "bg-red-700 text-white", // Partido Comunista Português
  "CDU": "bg-red-700 text-white", // Coligação Democrática Unitária (PCP)
  "PEV": "bg-green-700 text-white", // Partido Ecologista "Os Verdes"
  "PAN": "bg-emerald-500 text-white", // Pessoas–Animais–Natureza
  "IL": "bg-sky-600 text-white", // Iniciativa Liberal
  "CHEGA": "bg-blue-900 text-white", // Chega 
  "LIVRE": "bg-yellow-500 text-black", // LIVRE
  "MPT": "bg-yellow-400 text-gray-900", // Partido da Terra
  "NÓS, CIDADÃOS": "bg-amber-300 text-gray-800", // Nós, Cidadãos!
  "NC": "bg-amber-300 text-gray-800", // Nós, Cidadãos!
  "JPP": "bg-teal-400 text-white", // Juntos pelo Povo
  "PCTP/MRPP": "bg-red-600 text-white", // Partido Comunista dos Trabalhadores Portugueses
  "PPM": "bg-[linear-gradient(to_right,_white_50%,_#0369a1_50%)] text-gray-900", // Partido Popular Monárquico
  "VP": "bg-purple-600 text-white", // Volt Portugal (Purple)
  "ADN": "bg-[linear-gradient(to_right,_white_50%,_#0369a1_50%)] text-gray-900", // Alternativa Democrática Nacional
  "MOVIMENTOS CIDADÃOS": "bg-gray-500 text-white", // Movimentos Cidadãos
};

export function getPartyColorClass(party) {
  if (!party) return "bg-gray-200 text-gray-700";
  const key = party.trim().toUpperCase();
  return PARTY_COLORS[key] || "bg-gray-200 text-gray-700";
}

export function getPartyColorHex(party) {
  const colorClass = getPartyColorClass(party);
  const match = colorClass.match(/bg-(\w+)-(\d+)/);
  if (match) {
    const [_, color, shade] = match;
    return `#${color}${shade}`;
  }
  return "#cccccc";
}