import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { X, Scale, Award, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

export const AccusationTable: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { progress, definitions, submitAccusation, activeCaseId, triggerAudio } = useGame();
  
  // Placed slots state
  const [culpritCard, setCulpritCard] = useState<any | null>(null);
  const [weaponCard, setWeaponCard] = useState<any | null>(null);
  const [motiveCard, setMotiveCard] = useState<any | null>(null);
  const [methodCard, setMethodCard] = useState<any | null>(null);
  const [timeCard, setTimeCard] = useState<any | null>(null);
  const [supportingEvidence, setSupportingEvidence] = useState<any[]>([]);

  // Result state
  const [verdictResult, setVerdictResult] = useState<any | null>(null);

  // Available cards list
  const availableSuspects = progress?.unlocked_people.map((p: any) => ({
    id: p.id,
    type: 'suspect',
    title: p.name,
    tag: 'Suspect'
  })) || [];

  const availableEvidence = progress?.discovered_evidence.map((id: string) => {
    const clue = definitions?.evidence[id];
    return {
      id,
      type: 'evidence',
      title: clue?.title || id,
      tag: clue?.tags?.[0] || 'Evidence'
    };
  }) || [];

  const availableContradictions = progress?.discovered_contradictions.map((id: string) => ({
    id,
    type: 'evidence',
    title: `🚨 CONTRADICTION: ${id.replace(/_/g, ' ').toUpperCase()}`,
    tag: 'Contradiction'
  })) || [];

  const allAvailableCards = [...availableSuspects, ...availableEvidence, ...availableContradictions];

  // Drag states
  const handleDragStart = (e: React.DragEvent, card: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(card));
    triggerAudio('paper');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropSlot = (e: React.DragEvent, slotType: 'culprit' | 'weapon' | 'motive' | 'method' | 'time' | 'supporting') => {
    e.preventDefault();
    try {
      const card = JSON.parse(e.dataTransfer.getData('application/json'));
      triggerAudio('pin');

      if (slotType === 'culprit') {
        if (card.type !== 'suspect') return alert('Only suspects can be accused as culprits.');
        setCulpritCard(card);
      } else if (slotType === 'weapon') {
        if (card.type === 'suspect') return;
        setWeaponCard(card);
      } else if (slotType === 'motive') {
        if (card.type === 'suspect') return;
        setMotiveCard(card);
      } else if (slotType === 'method') {
        if (card.type === 'suspect') return;
        setMethodCard(card);
      } else if (slotType === 'time') {
        if (card.type === 'suspect') return;
        setTimeCard(card);
      } else if (slotType === 'supporting') {
        if (card.type === 'suspect') return;
        if (supportingEvidence.find(c => c.id === card.id)) return;
        if (supportingEvidence.length >= 5) return alert('Maximum 5 supporting evidence pieces.');
        setSupportingEvidence([...supportingEvidence, card]);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const clearSlot = (slotType: 'culprit' | 'weapon' | 'motive' | 'method' | 'time' | 'supporting', id?: string) => {
    triggerAudio('paper');
    if (slotType === 'culprit') setCulpritCard(null);
    else if (slotType === 'weapon') setWeaponCard(null);
    else if (slotType === 'motive') setMotiveCard(null);
    else if (slotType === 'method') setMethodCard(null);
    else if (slotType === 'time') setTimeCard(null);
    else if (slotType === 'supporting' && id) {
      setSupportingEvidence(supportingEvidence.filter(c => c.id !== id));
    }
  };

  const presentCase = async () => {
    if (!activeCaseId) return;
    if (!culpritCard || !weaponCard || !motiveCard || !methodCard || !timeCard) {
      alert('You must populate all primary slots before presenting the case.');
      return;
    }

    const payload = {
      culprit: culpritCard.id,
      weapon: weaponCard.id,
      motive: motiveCard.id === 'burned_letter' ? 'embezzlement_exposure' : 'embezzlement_exposure', // Maps burned_letter to motive definition
      method: methodCard.id === 'cyanide_vial' || methodCard.id === 'wine_glass' ? 'cyanide_poisoning' : 'cyanide_poisoning', // Maps to method definition
      timeOfDeath: timeCard.id === 'security_footage' || timeCard.id === 'hallway_logs' ? '10:03 PM' : '9:17 PM',
      supportingEvidence: [
        weaponCard.id,
        motiveCard.id,
        methodCard.id,
        timeCard.id,
        ...supportingEvidence.map(c => c.id)
      ]
    };

    const res = await submitAccusation(activeCaseId, payload);
    if (res) {
      setVerdictResult(res);
      if (res.success) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    }
  };

  return (
    <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6 backdrop-blur-md">
      <div className="w-[1050px] h-[570px] bg-wood-900 border-4 border-wood-950 rounded-lg flex shadow-2xl relative overflow-hidden">
        
        {!verdictResult ? (
          <>
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-parchment-300 hover:text-white transition z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Drawer: Available cards */}
            <div className="w-1/3 border-r border-wood-950 p-6 flex flex-col gap-4 overflow-hidden bg-wood-950/20">
              <h2 className="font-serif text-lg text-yellow-500 tracking-wider font-bold uppercase border-b border-wood-950 pb-2">
                Clues & Suspects
              </h2>
              <p className="text-[10px] font-typewriter text-parchment-300/40">
                [Drag cards from this deck into table slots on the right]
              </p>

              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
                {allAvailableCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card)}
                    className={`p-3 rounded border shadow-sm cursor-grab active:cursor-grabbing text-left select-none relative transition ${
                      card.type === 'suspect'
                        ? 'border-wood-600 bg-wood-950 text-parchment-100'
                        : card.title.includes('CONTRADICTION')
                        ? 'border-red-500/40 bg-red-950/20 text-red-300'
                        : 'border-wood-750 bg-parchment-100 text-noir-900'
                    }`}
                  >
                    <span className="absolute right-2 top-2 text-[7px] font-typewriter uppercase tracking-widest opacity-40">
                      {card.tag}
                    </span>
                    <div className="font-serif text-xs font-bold w-11/12">{card.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Desk: Drag slots */}
            <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
              
              <div className="flex justify-between items-center border-b border-wood-950 pb-2.5 mb-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-serif text-base text-yellow-500 font-bold uppercase tracking-wider">
                    Courtroom Case Presentation
                  </h3>
                </div>
                <span className="text-[10px] font-typewriter text-parchment-300/40">Present case file to Judge</span>
              </div>

              {/* Placed slots matrix */}
              <div className="flex-1 grid grid-cols-3 gap-5">
                
                {/* Culprit Slot */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropSlot(e, 'culprit')}
                  className="border-2 border-dashed border-red-900/30 rounded p-4 flex flex-col justify-center items-center bg-black/20 relative group min-h-[120px]"
                >
                  <span className="absolute top-2 left-2 text-[8px] font-typewriter text-red-500 uppercase tracking-widest">1. Accused Culprit</span>
                  {culpritCard ? (
                    <div className="bg-red-950/50 border border-red-700 text-red-200 text-xs p-3 rounded font-serif font-bold relative w-full text-center">
                      {culpritCard.title}
                      <button onClick={() => clearSlot('culprit')} className="absolute top-1 right-1 text-red-500 hover:text-white">&times;</button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-typewriter text-parchment-300/20 italic">Drop Suspect Card Here</span>
                  )}
                </div>

                {/* Weapon Slot */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropSlot(e, 'weapon')}
                  className="border-2 border-dashed border-wood-800/30 rounded p-4 flex flex-col justify-center items-center bg-black/20 relative min-h-[120px]"
                >
                  <span className="absolute top-2 left-2 text-[8px] font-typewriter text-yellow-600 uppercase tracking-widest">2. Murder Weapon</span>
                  {weaponCard ? (
                    <div className="bg-parchment-100 text-noir-900 text-xs p-3 rounded font-serif font-bold relative w-full text-center">
                      {weaponCard.title}
                      <button onClick={() => clearSlot('weapon')} className="absolute top-1 right-1 text-red-700 hover:text-red-950">&times;</button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-typewriter text-parchment-300/20 italic">Drop Clue Card Here</span>
                  )}
                </div>

                {/* Motive Slot */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropSlot(e, 'motive')}
                  className="border-2 border-dashed border-wood-800/30 rounded p-4 flex flex-col justify-center items-center bg-black/20 relative min-h-[120px]"
                >
                  <span className="absolute top-2 left-2 text-[8px] font-typewriter text-yellow-600 uppercase tracking-widest">3. Primary Motive</span>
                  {motiveCard ? (
                    <div className="bg-parchment-100 text-noir-900 text-xs p-3 rounded font-serif font-bold relative w-full text-center">
                      {motiveCard.title}
                      <button onClick={() => clearSlot('motive')} className="absolute top-1 right-1 text-red-700 hover:text-red-950">&times;</button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-typewriter text-parchment-300/20 italic">Drop motive file/letter</span>
                  )}
                </div>

                {/* Method Slot */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropSlot(e, 'method')}
                  className="border-2 border-dashed border-wood-800/30 rounded p-4 flex flex-col justify-center items-center bg-black/20 relative min-h-[120px]"
                >
                  <span className="absolute top-2 left-2 text-[8px] font-typewriter text-yellow-600 uppercase tracking-widest">4. Execution Method</span>
                  {methodCard ? (
                    <div className="bg-parchment-100 text-noir-900 text-xs p-3 rounded font-serif font-bold relative w-full text-center">
                      {methodCard.title}
                      <button onClick={() => clearSlot('method')} className="absolute top-1 right-1 text-red-700 hover:text-red-950">&times;</button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-typewriter text-parchment-300/20 italic">Drop poison/pills vial</span>
                  )}
                </div>

                {/* Time of Death Slot */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropSlot(e, 'time')}
                  className="border-2 border-dashed border-wood-800/30 rounded p-4 flex flex-col justify-center items-center bg-black/20 relative min-h-[120px]"
                >
                  <span className="absolute top-2 left-2 text-[8px] font-typewriter text-yellow-600 uppercase tracking-widest">5. Time of Death</span>
                  {timeCard ? (
                    <div className="bg-parchment-100 text-noir-900 text-xs p-3 rounded font-serif font-bold relative w-full text-center">
                      {timeCard.title}
                      <button onClick={() => clearSlot('time')} className="absolute top-1 right-1 text-red-700 hover:text-red-950">&times;</button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-typewriter text-parchment-300/20 italic">Drop gate logs / watch</span>
                  )}
                </div>

                {/* Supporting evidence (up to 5) */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropSlot(e, 'supporting')}
                  className="border-2 border-dashed border-wood-800/30 rounded p-3 flex flex-col justify-start items-center bg-black/20 relative min-h-[120px] overflow-y-auto"
                >
                  <span className="absolute top-2 left-2 text-[8px] font-typewriter text-yellow-600 uppercase tracking-widest">6. Supporting Clues</span>
                  <div className="flex flex-col gap-1 w-full mt-6">
                    {supportingEvidence.map(c => (
                      <div key={c.id} className="bg-parchment-100 text-noir-900 text-[10px] p-1.5 rounded font-serif font-bold relative text-center">
                        {c.title.slice(0, 20)}...
                        <button onClick={() => clearSlot('supporting', c.id)} className="absolute top-0.5 right-1 text-red-700">&times;</button>
                      </div>
                    ))}
                    {supportingEvidence.length === 0 && (
                      <span className="text-[9px] font-typewriter text-parchment-300/10 italic text-center mt-3">Drop 3-5 auxiliary clues</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Submit Case */}
              <div className="flex justify-center mt-6 pt-4 border-t border-wood-950">
                <button
                  disabled={!culpritCard || !weaponCard || !motiveCard || !methodCard || !timeCard}
                  onClick={presentCase}
                  className="px-10 py-3.5 bg-crimson hover:bg-red-700 disabled:opacity-35 transition text-parchment-50 font-typewriter font-bold uppercase tracking-wider text-sm shadow-lg rounded"
                >
                  Present Case File to Judge
                </button>
              </div>

            </div>
          </>
        ) : (
          // VERDICT PARCHMENT SCREEN
          <div className="flex-1 p-10 flex flex-col justify-between bg-parchment-100 paper-texture text-noir-900 overflow-y-auto">
            
            {/* Dossier Result Header */}
            <div className="flex flex-col border-b-2 border-noir-900 pb-4 text-center">
              <h2 className="font-serif text-3xl font-extrabold uppercase tracking-widest text-noir-950">
                Official Court Verdict
              </h2>
              <div className="mt-2 font-typewriter text-xs text-noir-900/60 uppercase">
                Red String Case Resolution File
              </div>
            </div>

            {/* Ending Details Card */}
            <div className="flex-1 my-6 max-w-2xl mx-auto flex flex-col justify-center items-center text-center gap-6">
              
              <div className="flex flex-col gap-2">
                <div className="font-serif text-2xl font-bold text-crimson uppercase">
                  {verdictResult.title}
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Award className="w-5 h-5 text-yellow-600" />
                  <span className="font-typewriter text-sm font-bold uppercase tracking-wider">
                    Rating: {verdictResult.rating}
                  </span>
                </div>
              </div>

              <p className="font-typewriter text-sm leading-relaxed text-noir-800 bg-white/40 border border-noir-900/10 p-5 rounded italic">
                "{verdictResult.description}"
              </p>

              {/* Investigation scoring details */}
              <div className="grid grid-cols-2 gap-6 w-full max-w-md font-typewriter text-xs text-left border-t border-dashed border-noir-900/20 pt-4">
                <div className="flex flex-col gap-1.5">
                  <div>Score: <strong className="text-crimson text-sm">{verdictResult.score}%</strong></div>
                  <div>Clues Discovered: <strong>{verdictResult.stats.cluesDiscovered}</strong></div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Time Spent: <strong>{verdictResult.stats.timeSpentMinutes} mins</strong></span>
                  </div>
                  <div>Contradictions Exposed: <strong>{verdictResult.stats.contradictionsFound}</strong></div>
                </div>
              </div>

            </div>

            {/* Close dossier */}
            <div className="flex justify-center border-t border-noir-900/10 pt-4">
              <button 
                onClick={() => {
                  triggerAudio('door');
                  onClose();
                }}
                className="px-6 py-2.5 bg-noir-900 hover:bg-noir-950 text-parchment-100 transition rounded font-typewriter uppercase tracking-wider text-xs"
              >
                Close Verdict dossier
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
export default AccusationTable;
