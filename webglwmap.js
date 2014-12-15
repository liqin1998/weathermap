// Ce script se charge de toute la partie de rendu à partir des données récupérées
// par le script weathermap.js

// variable globale devices : tableau des devices
var devices = {};

// variable globale links : tableau des links
var links = [];


// objet Device
var Device = function(name, type, coord, label, ifnames) {
  this.name = name;
  this.type = type;
  this.label = label;
  this.x = coord[0];
  this.y = coord[1];
  this.z = coord[2];
  this.ifnames = ifnames;
  this.link = {};                       // this.link[iface_name] = objet_link
  this.metrics = {};
  this.visuals = {}
  for (var i in ifnames) {
    this.metrics[i] = {};               // objet mesure
    this.metrics[i].previous = [0,0];   // mesure précédente
    this.metrics[i].last = [0,0];       // dernière mesure
    this.metrics[i].current = [0,0];    // valeur courante calculée entre la dernière et la précédente (tween)
    this.metrics[i].step = [0,0];       // pas de progression entre précédente et dernière
    this.visuals[i] = {};               // objet visuel
  }
}

// objet Link
var Link = function(ifname, device_origin, device_destination) {
  this.name = ifname;
  this.device_origin = device_origin;
  this.device_destination = device_destination;
}

Link.prototype.setSpeed = function(speed) {
  this.speed = speed;
}

// fonction createDevices()
// crée les objets Device et les range dans le tableau devices
function createDevices() {
  for(var i=0; i<graph.length; i++) {
    var dev = new Device(graph[i]["name"], graph[i]["type"], graph[i]["coord"],graph[i]["label"],graph[i]["ifnames"]);
    devices[graph[i]["name"]] = dev;
  }
}


// fonction createLinks()
// crée tous les objets Link et les range dans le tableau links
function createLinks() {
  // boucle sur tous les devices
  for ( var i in devices ) {
    var device_ifnames = devices[i].ifnames;
    // boucle sur les ifnames du device
    for (ifname in device_ifnames) {
      // si le ifname a une destination (not null)
      if ( device_ifnames[ifname] != null ) {
        lk = new Link(ifname, devices[i], devices[device_ifnames[ifname]]);
        links.push(lk);
        devices[i].link[ifname] = lk;
      // si la destination == null, on passe au suivant => pas de lien
      }
    }
  }
}


// function makeTextSprite
// renvoie un sprite
function makeTextSprite(text) {
  var dynamicTexture = new THREEx.DynamicTexture(600,300);
  dynamicTexture.texture.needsUpdate = true;
  dynamicTexture.drawText(text,10,200, 'black', "bolder 72px Arial black");
  var spriteMaterial = new THREE.SpriteMaterial( {map: dynamicTexture.texture} );
  var sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.5 * 72 * 1.8, 0.25 * 72 *1.8, 0);
  return sprite;
}

// on met le rendu dans une fonction appelée par le init() général
function displayGraph(refresh_rate) {

  // on crée tous les objets logiques à manipuler
  createDevices();
  createLinks();

  // initialisation de la scène et du renderer
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth /window.innerHeight, 0.1, 5000);
  var renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0xFEFEFE, 0.9);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMapEnabled = true;
  document.querySelector('#WebGL').appendChild(renderer.domElement);

  camera.position.x = 0;
  camera.position.y = 10;
  camera.position.z = 600;
  camera.lookAt(scene.position);

  // var  axes = new THREE.AxisHelper(20);
  // scene.add(axes);

  var ambientLight = new THREE.AmbientLight(0xFEFEFE);
  scene.add(ambientLight);

  // initialisation des contrôle du trackball
  var trackballControls = new THREE.TrackballControls(camera);
  trackballControls.rotateSpeed = 1.0;
  trackballControls.zoomSpeed = 1.0;
  trackballControls.panSpeed = 1.0;
  
  // dessin de tous les équipements du graphe
  // dessin des devices
  for( var i in devices ) {
    var deviceGeometry = new THREE.BoxGeometry(50,10,25);
    var deviceMaterial = new THREE.MeshLambertMaterial();
    //deviceMaterial.color.setRGB(.7,.5,.5);
    deviceMaterial.ambient.setRGB(.5,.5,.5);
    deviceMaterial.transparent = true;
    deviceMaterial.opacity = .9;

    var device = new THREE.Mesh(deviceGeometry, deviceMaterial);
    device.position.x = devices[i].x;
    device.position.y = devices[i].y;
    device.position.z = devices[i].z;
    scene.add(device);

    //var label = makeTextSprite(devices[i].name);
    var label = makeTextSprite(devices[i].name);
    label.position.set(devices[i].label[0], devices[i].label[1], devices[i].label[2]);
    scene.add(label);
  }

  // dessin des liens
  // rayon de la section d'un lien tubulaire
  var linkRadius = 3;
  // courbe du lien : courbe de Bézier, déport latéral y d'un unique point de contrôle au milieu des extrémités du lien ... pour l'instant
  var curveRadius = 10;
  for ( var i=0; i<links.length; i++) {
      var originIn = new THREE.Vector3(links[i].device_origin.x-linkRadius, links[i].device_origin.y, links[i].device_origin.z);
      var targetIn = new THREE.Vector3(links[i].device_destination.x-linkRadius, links[i].device_destination.y, links[i].device_destination.z);
      var middleIn = new THREE.Vector3( (links[i].device_origin.x-linkRadius+links[i].device_destination.x)/2,
                                      (links[i].device_origin.y+links[i].device_destination.y)/2 - curveRadius,
                                      (links[i].device_origin.z+links[i].device_destination.z)/2 );
      var originOut = new THREE.Vector3(links[i].device_origin.x+linkRadius, links[i].device_origin.y, links[i].device_origin.z);
      var targetOut = new THREE.Vector3(links[i].device_destination.x+linkRadius, links[i].device_destination.y, links[i].device_destination.z);
      var middleOut = new THREE.Vector3( (links[i].device_origin.x+linkRadius+links[i].device_destination.x)/2,
                                      (links[i].device_origin.y+links[i].device_destination.y)/2 - curveRadius,
                                      (links[i].device_origin.z+links[i].device_destination.z)/2 );
      //var curve = new THREE.LineCurve3( origin, target ); 
      var curveIn = new THREE.QuadraticBezierCurve3(originIn, middleIn, targetIn ); 
      var curveOut = new THREE.QuadraticBezierCurve3(originOut, middleOut, targetOut ); 
      var linkGeometryIn = new THREE.TubeGeometry(curveIn,64,linkRadius);
      var linkGeometryOut = new THREE.TubeGeometry(curveOut,64,linkRadius);

      var linkMaterialIn = new THREE.MeshLambertMaterial();
      linkMaterialIn.ambient.setRGB(0,0,1);
      linkMaterialIn.transparent = true;
      linkMaterialIn.opacity = .4;
      var linkIn = new THREE.Mesh(linkGeometryIn, linkMaterialIn);

      var linkMaterialOut = new THREE.MeshLambertMaterial();
      linkMaterialOut.ambient.setRGB(1,0,0);
      linkMaterialOut.transparent = true;
      linkMaterialOut.opacity = .4;
      var linkOut = new THREE.Mesh(linkGeometryOut, linkMaterialOut);

      var labelTexture = new THREEx.DynamicTexture(600,512);
      labelTexture.texture.needsUpdate = true;
      labelTexture.context.font = "bolder 72px Arial";
      var linkLabelMaterial = new THREE.SpriteMaterial( {map: labelTexture.texture} );
      var linkLabel = new THREE.Sprite(linkLabelMaterial);
      linkLabel.position.set(20,20,20);
      linkLabel.scale.set(0.5 * 72 * 1.2, 0.25 * 72 *1.2, 0);
      labelTexture.clear().drawText(links[i].device_origin.name, undefined, 256, 'red');

      scene.add(linkIn);
      scene.add(linkOut);
      scene.add(linkLabel);
  }

  // fonction limit(var, limite, pas) : si var dépasse limite dans le sens du pas alors retourne limite, sinon retourne vr
  function limit(vr, lm, stp) {
    if (stp == 0) { return vr; }
    if (stp > 0 ) {
      if (vr >= lm) { return lm; }
    }
    else {
      if (lm >= vr) { return lm; }
    }
    return vr;
  }

  // mise à jour des données de monitoring
  function updateData(frequency) {
     var prd = refresh_rate * frequency; // nombre de portions
    // pour chaque entrée de data, on met à jour les attributs des Devices
    for (var res in data) {
      var dev = devices[res];
      var metrics = dev.metrics;
      var ifaces = data[res];
      for (var i=0; i<ifaces.length; i++) {
        var ifname = ifaces[i]["name"];
        var descr = ifaces[i]["descr"];
        var speed = ifaces[i]["speed"];
        var octInOut = ifaces[i]["octInOut"];
        // mesure de la bande bassante
        var mbps = 8 / 1000 / 1000;
        var mbpsIn = octInOut[0]  * mbps;
        var mbpsOut = octInOut[1] * mbps;
        // si la mesure change
        if ( metrics[ifname].last[0] != mbpsIn || metrics[ifname].last[1] != mbpsOut) {
          metrics[ifname].previous[0] = metrics[ifname].last[0];
          metrics[ifname].previous[1] = metrics[ifname].last[1];
          metrics[ifname].last[0] = mbpsIn;
          metrics[ifname].last[1] = mbpsOut;
          metrics[ifname].current[0] = metrics[ifname].previous[0];
          metrics[ifname].current[1] = metrics[ifname].previous[1];
          metrics[ifname].step = [ (metrics[ifname].last[0] - metrics[ifname].previous[0]) /prd , (metrics[ifname].last[1] - metrics[ifname].previous[1]) /prd ];
        }
        else {
          metrics[ifname].current[0] += metrics[ifname].step[0];
          metrics[ifname].current[1] += metrics[ifname].step[1];
          metrics[ifname].current[0] = limit(metrics[ifname].current[0], metrics[ifname].last[0], metrics[ifname].step[0]);
          metrics[ifname].current[1] = limit(metrics[ifname].current[1], metrics[ifname].last[1], metrics[ifname].step[1]);
        }
      }
    }
  }

  // mise à jour visuelle des éléments du graphe
  function updateGraph() {
    //console.log(devices["rtr-central"].metrics["Gi1/0/22"].previous[0],devices["rtr-central"].metrics["Gi1/0/22"].current[0], devices["rtr-central"].metrics["Gi1/0/22"].last[0]);

    for (dev in devices) {
      // test
    }
  }

  // affichage du graphe
  function render() {  
      var delta = clock.getDelta();
      trackballControls.update(delta);
      renderer.render(scene, camera);
  }

  // boucle infinie : màj données, màj dessins, rendu
  function loop() {
    window.requestAnimationFrame(loop);
    updateData(60);
    updateGraph();
    render();
  }

  var clock = new THREE.Clock();
  loop();

}


