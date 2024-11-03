// ================ INITIALISATION DE LA CARTE ================
// URL du fichier GeoJSON sur GitHub
const geoJsonUrl = 'https://raw.githubusercontent.com/GCDani/receptacleseeb/refs/heads/main/sitecoffres3.geojson';

let geoJsonLayer; // Déclaration globale pour le layer GeoJSON

// Initialisation de la carte Leaflet
const map = L.map('map').setView([5.275317, -3.939429], 12.5);

// Couche de base OpenStreetMap
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
});

// Couche de base Satellite (ESRI)
const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

const cyclOSMLayer = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    attribution: '<a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a> | Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Ajouter la couche de base OpenStreetMap par défaut
cyclOSMLayer.addTo(map);

// Ajouter l'échelle à la carte avec uniquement les kilomètres
L.control.scale({
    position: 'bottomleft',
    metric: true,
    imperial: false,
    maxWidth: 100,
    updateWhenIdle: true
}).addTo(map);

// Après la création de la carte
map.zoomControl.remove();  // Supprimer le contrôle de zoom existant
L.control.zoom({
    position: 'topright'
}).addTo(map);

// Ajout du contrôle de mesure
const measureControl = new L.Control.Measure({
    position: 'bottomleft',
    primaryLengthUnit: 'meters',
    secondaryLengthUnit: 'kilometers',
    primaryAreaUnit: 'sqmeters',
    secondaryAreaUnit: 'hectares',
    activeColor: '#2abd7a',
    completedColor: '#026726'
});
measureControl.addTo(map);

// Ajout du contrôle de géolocalisation
const locateControl = L.control.locate({
    position: 'topright',
    strings: {
        title: "Ma position"
    },
    locateOptions: {
        maxZoom: 18,
        enableHighAccuracy: true
    }
}).addTo(map);

// Création du contrôle de recentrage
const CenterViewControl = L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-center');
        
        // Bouton pour centrer sur la vue initiale
        const buttonCenter = L.DomUtil.create('a', 'leaflet-control-center-button', container);
        buttonCenter.href = '#';
        buttonCenter.title = 'Vue initiale';
        buttonCenter.innerHTML = '<i class="fas fa-home"></i>';

        L.DomEvent.on(buttonCenter, 'click', function(e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            map.setView([5.275317, -3.939429], 12.5);
        });

        return container;
    }
});

// Ajout du contrôle à la carte
map.addControl(new CenterViewControl());


// Ajout du contrôle de plein écran
const fullscreenControl = L.control.fullscreen({
    position: 'bottomleft',
    title: {
        'false': 'Plein écran',
        'true': 'Quitter le plein écran'
    },
    content: null,
    forceSeparateButton: true,
    forcePseudoFullscreen: true
}).addTo(map);

// Gestion des événements de plein écran
map.on('enterFullscreen', function(){
    if(map.isFullscreen()) {
        console.log('La carte est en mode plein écran');
    }
});

map.on('exitFullscreen', function(){
    if(!map.isFullscreen()) {
        console.log('La carte a quitté le mode plein écran');
    }
});

// ================ FONCTIONS UTILITAIRES ================
// Fonction pour détruire un graphique existant
function destroyChart(chartId) {
    const chartElement = Chart.getChart(chartId);
    if (chartElement) {
        chartElement.destroy();
    }
}

// Fonction pour remplir un sélecteur
function fillSelect(id, values) {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="">Tous</option>';
    [...values].sort().forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        // Si c'est le filtre de statut et la valeur est "actif", le sélectionner par défaut
        if (id === 'status-filter' && value === 'actif') {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

// Fonction pour mettre à jour les statistiques
function updateStats(features) {
    const totalCoffres = features.length;
    
    const totalCoffre = features.reduce((sum, feature) => {
        const numCoffre = parseFloat(feature.properties.Num_Coffre);
        return sum + (isNaN(numCoffre) ? 0 : numCoffre);
    }, 0);
    
    const totalCapacity = features.reduce((sum, feature) => {
        const capacity = parseFloat(feature.properties.Type_Capac);
        return sum + (isNaN(capacity) ? 0 : capacity);
    }, 0);

    document.getElementById('total-coffres').textContent = totalCoffres;
    document.getElementById('total-coffre').textContent = totalCoffre.toFixed(0);
    document.getElementById('total-capacity').textContent = totalCapacity.toFixed(1);

    // Mise à jour des graphiques
    createCapacityChart(features);
    createStatusChart(features);
    createCommuneChart(features);
    createCapacityCommuneChart(features);

}

// Fonction pour créer le graphique de la capacité
function createCapacityChart(features) {
    destroyChart('capacityChart');
    const capacities = {};
    features.forEach(feature => {
        const capacity = feature.properties.Type_Capac;
        const numCoffre = feature.properties.Num_Coffre;
        capacities[capacity] = (capacities[capacity] || 0) + numCoffre;
    });

    const ctx = document.getElementById('capacityChart').getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(capacities),
            datasets: [{
                label: 'Nombre de coffres par capacité',
                data: Object.values(capacities),
                backgroundColor: '#2abd7a',
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Nombre de coffres'
                    }
                }
            }
        }
    });
}

// Fonction pour créer le graphique du statut
function createStatusChart(features) {
    destroyChart('statusChart');
    const statuses = {};
    features.forEach(feature => {
        const status = feature.properties.Statut;
        statuses[status] = (statuses[status] || 0) + 1;
    });

    const ctx = document.getElementById('statusChart').getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statuses),
            datasets: [{
                data: Object.values(statuses),
                backgroundColor: ['#2abd7a', '#7d8581']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Fonction pour créer le graphique du nombre de coffres par commune
function createCommuneChart(features) {
    destroyChart('communeChart');
    const communeCounts = {};
    features.forEach(feature => {
        const commune = feature.properties.Commune;
        const numCoffre = feature.properties.Num_Coffre;
        communeCounts[commune] = (communeCounts[commune] || 0) + numCoffre;
    });

    const ctx = document.getElementById('communeChart').getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(communeCounts),
            datasets: [{
                label: 'Nombre de coffres par commune',
                data: Object.values(communeCounts),
                backgroundColor: '#2abd7a'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
function createCapacityCommuneChart(features) {
    destroyChart('capacityCommuneChart');
    const communesByCapacity = {};
    
    // Organiser les données par commune et par capacité
    features.forEach(feature => {
        const capacity = feature.properties.Type_Capac;
        const commune = feature.properties.Commune;
        const numCoffre = feature.properties.Num_Coffre;
        if (!communesByCapacity[capacity]) {
            communesByCapacity[capacity] = {};
        }
        communesByCapacity[capacity][commune] = (communesByCapacity[capacity][commune] || 0) + numCoffre;
    });

    // Définir une palette de couleurs fixe pour les capacités
    const colorPalette = {
        '20m3': '#026726',
        '5m3': '#8dd018',
        '4m3': '#2abd7a',  
        'Très grande': '#213106' // Jaune
    };

    // Obtenir les labels pour les communes et les capacités
    const communes = Array.from(new Set(features.map(f => f.properties.Commune)));
    const capacities = Object.keys(communesByCapacity);

    // Préparer les datasets pour chaque capacité
    const datasets = capacities.map(capacity => {
        return {
            label: `${capacity}`,
            data: communes.map(commune => communesByCapacity[capacity][commune] || 0),
            backgroundColor: colorPalette[capacity] || '#gray', // Utilise la couleur définie ou gris par défaut
            borderColor: '#ffffff',
            borderWidth: 2
        };
    });

    // Créer le graphique
    const ctx = document.getElementById('capacityCommuneChart').getContext('2d');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: communes,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Nombre de coffres'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Commune'
                    }
                }
            }
        }
    });
}

// ================ GESTIONNAIRE DE DONNÉES ================

function createDataManager(data, geoJsonLayer) {
    let currentSearchTerm = '';
    let currentFilters = {
        commune: '',
        capacity: '',
        platform: '',
        status: ''
    };

    function applyFiltersAndSearch() {
        const filteredFeatures = data.features.filter(feature => {
            const props = feature.properties;
            const matchesSearch = currentSearchTerm === '' || 
                (props.Nom && props.Nom.toLowerCase().includes(currentSearchTerm.toLowerCase()));
            
            const matchesFilters = 
                (!currentFilters.commune || props.Commune === currentFilters.commune) &&
                (!currentFilters.capacity || props.Type_Capac === currentFilters.capacity) &&
                (!currentFilters.platform || props.Plateforme === currentFilters.platform) &&
                (!currentFilters.status || props.Statut === currentFilters.status);

            return matchesSearch && matchesFilters;
        });

        // Réinitialiser la carte
        map.flyTo([5.275317, -3.939429], 12.5);

        // Mettre à jour la couche GeoJSON sur la carte
        geoJsonLayer.clearLayers();
        geoJsonLayer.addData({
            type: 'FeatureCollection',
            features: filteredFeatures
        });

        // Mettre à jour les statistiques et les graphiques
        updateStats(filteredFeatures);
        return filteredFeatures;
    }

    return {
        updateSearch: (searchTerm) => {
            currentSearchTerm = searchTerm;
            const filteredFeatures = applyFiltersAndSearch();
            return filteredFeatures;
        },
        updateFilters: (filters) => {
            currentSearchTerm = '';
            currentFilters = {...filters};
            const filteredFeatures = applyFiltersAndSearch();
            return filteredFeatures;
        },
        getCurrentState: () => {
            const filteredFeatures = applyFiltersAndSearch();
            return {
                searchTerm: currentSearchTerm,
                filters: {...currentFilters}
            };
        }
    };
}

// ================ INITIALISATION DES FILTRES ================

function initializeFilters(data, geoJsonLayer) {
    const dataManager = createDataManager(data, geoJsonLayer);
    
    const communes = new Set();
    const capacities = new Set();
    const platforms = new Set();
    const statuses = new Set();

    data.features.forEach(feature => {
        const props = feature.properties;
        if (props.Commune) communes.add(props.Commune);
        if (props.Type_Capac) capacities.add(props.Type_Capac);
        if (props.Plateforme) platforms.add(props.Plateforme);
        if (props.Statut) statuses.add(props.Statut);
    });

    fillSelect('commune-filter', communes);
    fillSelect('capacity-filter', capacities);
    fillSelect('platform-filter', platforms);
    fillSelect('status-filter', statuses);

    // Définir "actif" comme valeur par défaut pour le filtre de statut
    document.getElementById('status-filter').value = 'actif';
    
    // Appliquer les filtres initiaux
    const initialFilters = {
        commune: '',
        capacity: '',
        platform: '',
        status: 'actif'  // Définir le statut initial comme "actif"
    };
    
    // Mettre à jour les données avec le filtre initial
    dataManager.updateFilters(initialFilters);

    ['commune-filter', 'capacity-filter', 'platform-filter', 'status-filter'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            const filters = {
                commune: document.getElementById('commune-filter').value,
                capacity: document.getElementById('capacity-filter').value,
                platform: document.getElementById('platform-filter').value,
                status: document.getElementById('status-filter').value
            };
            const filteredFeatures = dataManager.updateFilters(filters);
            updateStats(filteredFeatures);
        });
    });

    return dataManager;
}

// ================ CONTRÔLE DE RECHERCHE ================
function createSearchControl(data, map, dataManager) {
   let highlightedMarker = null; // Variable pour stocker le marqueur en surbrillance

   // Ajouter un écouteur de clic sur la carte
   map.on('click', function() {
       if (highlightedMarker) {
           map.removeLayer(highlightedMarker);
           highlightedMarker = null;
       }
   });

   return L.Control.extend({
       options: {
           position: 'topleft'
       },
       onAdd: function () {
           const container = L.DomUtil.create('div', 'leaflet-control-search');
           const input = L.DomUtil.create('input', 'search-input', container);
           const resultsList = L.DomUtil.create('ul', 'search-results', container);
           input.type = 'text';
           input.placeholder = 'Rechercher un coffre par nom...';
           L.DomEvent.on(input, 'focus', function(e) {
               map.scrollWheelZoom.disable();
           });
           
           L.DomEvent.on(input, 'blur', function(e) {
               map.scrollWheelZoom.enable();
           });
           input.addEventListener('input', function(e) {
               const searchTerm = e.target.value.trim();
               resultsList.innerHTML = '';
               if (searchTerm.length >= 2) {
                   const filteredFeatures = dataManager.updateSearch(searchTerm);
                   
                   filteredFeatures.forEach(feature => {
                       const props = feature.properties;
                       const li = L.DomUtil.create('li', 'search-result-item', resultsList);
                       
                       li.innerHTML = `
                           <strong>${props.Nom}</strong><br>
                           <small>Commune: ${props.Commune} | Code: ${props.Cod}</small>
                       `;
                       
                       li.addEventListener('click', function() {
                           const coords = feature.geometry.coordinates;
                           map.setView([coords[1], coords[0]], 16);
                           
                           // Supprimer l'ancien marqueur en surbrillance s'il existe
                           if (highlightedMarker) {
                               map.removeLayer(highlightedMarker);
                           }

                           // Créer un nouveau marqueur en surbrillance
                           highlightedMarker = L.circleMarker([coords[1], coords[0]], {
                               radius: 9,
                               fillColor: '#ff0000',
                               color: '#ff0000',
                               weight: 4,
                               opacity: 1,
                               fillOpacity: 0.5
                           }).addTo(map);
                           
                           // Créer et ouvrir le popup avec le style
                           const popup = L.popup()
                               .setLatLng([coords[1], coords[0]])
                               .setContent(`
                                   <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px; text-align: center; 
                                               background-color: #dff7ce; padding: 8px; border-radius: 4px;">
                                       ${props.Nom}
                                   </div>
                                   <div style="font-size: 12px;">
                                       <b>Code complet:</b> ${props.Cod}<br>
                                       <b>N° code:</b> ${props["N° code"]}<br>
                                       <b>Nombre de coffre:</b> ${props.Num_Coffre}<br>
                                       <b>Capacité:</b> ${props.Type_Capac}<br>
                                       <b>Commune:</b> ${props.Commune}<br>
                                       <b>Circuit:</b> ${props.Num_Circuit}<br>
                                       <b>Plateforme:</b> ${props.Plateforme}<br>
                                   </div>
                               `);
                           
                           map.openPopup(popup);
                           input.value = '';
                           resultsList.innerHTML = '';
                           // Réinitialiser la carte et les graphiques
                           const currentState = dataManager.getCurrentState();
                           dataManager.updateFilters(currentState.filters);
                       });
                   });
               }
           });
           L.DomEvent.disableClickPropagation(container);
           L.DomEvent.disableScrollPropagation(container);
           return container;
       }
   });
}

// ================ CHARGEMENT DES DONNÉES ================
async function loadGeoJson() {
   try {
       // Définir une palette de couleurs fixe pour les capacités
       const colorPalette = {
            '20m3': '#026726',
            '5m3': '#8dd018',
            '4m3': '#2abd7a',  
       };

       // Fonction de création de légende
       function createLegend(colorPalette) {
           const legend = L.control({ position: 'bottomright' });

           legend.onAdd = function () {
               const div = L.DomUtil.create('div', 'map-legend');
               div.innerHTML = `
                   <div class="legend-section">
                       <div class="legend-subtitle">Capacités</div>
                       ${Object.entries(colorPalette).map(([capacity, color]) => 
                           `<div class="legend-item">
                               <span class="legend-color" style="background-color: ${color};"></span>
                               <span class="legend-label">${capacity}</span>
                           </div>`
                       ).join('')}
                   </div>
                   <div class="legend-section">
                       <div class="legend-subtitle">Statuts</div>
                       <div class="legend-item">
                           <span class="legend-color" style="background-color: #808080;"></span>
                           <span class="legend-label">Supprimé</span>
                       </div>
                   </div>
               `;
               return div;
           };

           return legend;
       }

       const response = await fetch(geoJsonUrl);
       const data = await response.json();
       const geoJsonLayer = L.geoJSON(data, {
           pointToLayer: (feature, latlng) => {
               let color;
               // Vérifier le statut du coffre
               if(feature.properties.Statut === 'supprimé') {
                   color = '#808080'; // Gris pour les coffres supprimés
               } else {
                   const capacity = feature.properties.Type_Capac;
                   color = colorPalette[capacity] || '#808080'; // Couleur selon la capacité pour les coffres actifs
               }
               
               return L.circleMarker(latlng, {
                   radius: 6,
                   fillColor: color,
                   color: color,
                   fillOpacity: 1
               });
           },
           onEachFeature: (feature, layer) => {
               const p = feature.properties;
               layer.bindPopup(`
                   <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px; text-align: center; 
                               background-color: #dff7ce; padding: 8px; border-radius: 4px;">
                       ${p.Nom}
                   </div>
                   <div style="font-size: 12px;">
                       <b>Code complet:</b> ${p.Cod}<br>
                       <b>N° code:</b> ${p["N° code"]}<br>
                       <b>Nombre de coffre:</b> ${p.Num_Coffre}<br>
                       <b>Capacité:</b> ${p.Type_Capac}<br>
                       <b>Commune:</b> ${p.Commune}<br>
                       <b>Circuit:</b> ${p.Num_Circuit}<br>
                       <b>Plateforme:</b> ${p.Plateforme}<br>
                   </div>
               `);
           }
       }).addTo(map);
 
        const dataManager = initializeFilters(data, geoJsonLayer);
        
        // Création et ajout de la légende
        const legend = createLegend(colorPalette);
        legend.addTo(map);

        L.control.layers(
            { "OpenStreetMap": osmLayer, "Satellite": satelliteLayer, "CyclOSM":cyclOSMLayer },
            { "Coffres GeoJSON": geoJsonLayer }
        ).addTo(map);

        const SearchControl = createSearchControl(data, map, dataManager);
        map.addControl(new SearchControl());
        
        // Initialiser les statistiques et les graphiques avec toutes les données
        updateStats(data.features);

    } catch (error) {
        console.error('Erreur lors du chargement des données GeoJSON:', error);
    }
}
// ================ DÉMARRAGE DE L'APPLICATION ================
loadGeoJson();
