const fs = require('fs');

try {
  // Lire les données d'entrée
  const inputData = JSON.parse(fs.readFileSync('input.json', 'utf8'));
  
  const {
    t21V: anneeConstruction,
    km2v: utilisation,
    "3efc": gammeSelectionnee,
    // Surfaces PAC 1
    "8HBA": surface1_pac1,
    nwio: surface2_pac1, 
    s4bD: surface3_pac1,
    "8Gzw": surface4_pac1,
    "8Xa1": surface5_pac1,
    // HSP PAC 1
    "5BWb": hsp1_pac1,
    "13AG": hsp2_pac1,
    nQ1S: hsp3_pac1,
    kUNi: hsp4_pac1,
    mvUV: hsp5_pac1,
    // Surfaces PAC 2
    bT9L: surface1_pac2,
    "8Fw1": surface2_pac2,
    dUTa: surface3_pac2,
    w7SX: surface4_pac2,
    "84Y4": surface5_pac2,
    // HSP PAC 2
    "3n7k": hsp1_pac2,
    "8PSC": hsp2_pac2,
    mYbk: hsp3_pac2,
    "31cn": hsp4_pac2,
    ry6f: hsp5_pac2
  } = inputData;

  // Calcul des coefficients selon l'année de construction
  let G, ratioFroid;
  if (anneeConstruction < 1974) { G = 1.6; }
  else if (anneeConstruction <= 1981) { G = 1.2; }
  else if (anneeConstruction <= 1999) { G = 0.9; }
  else if (anneeConstruction <= 2004) { G = 0.8; }
  else if (anneeConstruction <= 2011) { G = 0.7; }
  else { G = 0.57; }

  if (anneeConstruction < 2005) { ratioFroid = 40; }
  else if (anneeConstruction <= 2011) { ratioFroid = 35; }
  else { ratioFroid = 30; }

  // Déterminer le mode selon l'utilisation
  let usageMode;
  if (utilisation === "Chauffage uniquement") usageMode = "chauffage";
  else if (utilisation === "Climatisation uniquement") usageMode = "climatisation";
  else if (utilisation === "Les deux") usageMode = "chauffage_climatisation";
  else usageMode = "chauffage_climatisation";

  // Fonction pour traiter une PAC
  function traiterPAC(surfaces, hsps, pacId) {
    const unitesInterieures = [];
    
    surfaces.forEach((surface, index) => {
      if (surface && surface !== "" && !isNaN(surface) && parseFloat(surface) > 0) {
        const hsp = hsps[index] || 2.5; // Hauteur par défaut
        
        const puissanceChaud = Math.round(G * 25 * parseFloat(surface) * parseFloat(hsp) * 1.2);
        const puissanceFroid = Math.round(ratioFroid * parseFloat(surface) * parseFloat(hsp));
        
        let puissanceReference;
        switch(usageMode) {
          case 'chauffage': puissanceReference = puissanceChaud; break;
          case 'climatisation': puissanceReference = puissanceFroid; break;
          default: puissanceReference = Math.max(puissanceChaud, puissanceFroid);
        }

        unitesInterieures.push({
          id: `ui${index + 1}_pac${pacId}`,
          surface: parseFloat(surface),
          hauteurPlafond: parseFloat(hsp),
          puissanceChaud,
          puissanceFroid,
          puissanceReference,
          puissanceMin: Math.round(puissanceReference * 0.95),
          puissanceMax: Math.round(puissanceReference * 1.40)
        });
      }
    });

    // Calcul de l'UE pour cette PAC
    if (unitesInterieures.length > 0) {
      const sommePuissanceChaud = unitesInterieures.reduce((sum, ui) => sum + ui.puissanceChaud, 0);
      const sommePuissanceFroid = unitesInterieures.reduce((sum, ui) => sum + ui.puissanceFroid, 0);
      
      const ueChaud = Math.round(sommePuissanceChaud * 0.9);
      const ueFroid = Math.round(sommePuissanceFroid * 0.9);
      
      let ueReference;
      switch(usageMode) {
        case 'chauffage': ueReference = ueChaud; break;
        case 'climatisation': ueReference = ueFroid; break;
        default: ueReference = Math.max(ueChaud, ueFroid);
      }

      const uniteExterieure = {
        id: `ue_pac${pacId}`,
        puissanceChaud: ueChaud,
        puissanceFroid: ueFroid,
        puissanceReference: ueReference,
        puissanceMin: Math.round(ueReference * 0.95),
        puissanceMax: Math.round(ueReference * 1.40),
        nombreUI: unitesInterieures.length,
        gamme: gammeSelectionnee
      };

      return { unitesInterieures, uniteExterieure };
    }
    
    return null;
  }

  // Traitement des PACs
  const pac1Data = traiterPAC(
    [surface1_pac1, surface2_pac1, surface3_pac1, surface4_pac1, surface5_pac1],
    [hsp1_pac1, hsp2_pac1, hsp3_pac1, hsp4_pac1, hsp5_pac1],
    1
  );

  const pac2Data = traiterPAC(
    [surface1_pac2, surface2_pac2, surface3_pac2, surface4_pac2, surface5_pac2],
    [hsp1_pac2, hsp2_pac2, hsp3_pac2, hsp4_pac2, hsp5_pac2],
    2
  );

  // Consolidation des résultats
  const toutesUI = [];
  const toutesUE = [];

  if (pac1Data) {
    toutesUI.push(...pac1Data.unitesInterieures);
    toutesUE.push(pac1Data.uniteExterieure);
  }

  if (pac2Data) {
    toutesUI.push(...pac2Data.unitesInterieures);
    toutesUE.push(pac2Data.uniteExterieure);
  }

  // Résultat final
  const result = {
    success: true,
    coefficients: { G, ratioFroid },
    gamme: gammeSelectionnee,
    usage: usageMode,
    utilisation: utilisation,
    anneeConstruction: anneeConstruction,
    unitesInterieures: toutesUI,
    unitesExterieures: toutesUE,
    // Données spécialement formatées pour Make/Airtable
    airtable: {
      gamme: gammeSelectionnee,
      premiereUI: toutesUI[0] || null,
      premiereUE: toutesUE[0] || null,
      nombrePACs: toutesUE.length,
      nombreTotalUI: toutesUI.length
    }
  };

  // Écrire le résultat
  console.log(JSON.stringify(result, null, 2));

} catch (error) {
  console.log(JSON.stringify({
    success: false,
    error: error.message,
    stack: error.stack
  }, null, 2));
}
