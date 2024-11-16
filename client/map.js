const style = 'https://tiles.openfreemap.org/styles/bright';

export function initialize( container ) {
	const img = document.createElement( 'img' );
	img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
	img.hidden = true;
	document.body.append( img );

	const map = new maplibregl.Map( {
		container,
		zoom: 1.5,
		center: [0, 0],
		maxZoom: 24,
		style,
	//	hash: 'map',
		fadeDuration: 0,
	} );

	map.addControl( new maplibregl.ScaleControl );
	map.addControl( new maplibregl.NavigationControl );

	map.on( 'styleimagemissing', function( e ) {
		map.addImage( e.id, img );
	} );

	return map;
}

function forOnLoad( map ) {
	return new Promise( ( resolve ) => {
		map.on( 'load', ( event ) => resolve( event ) );
	} );
}

export async function addGeoJSON( map, source, geoJSON ) {
	await forOnLoad( map );

	map.addSource( source, {
		type: 'geojson',
		data: {
			...geoJSON,
			features: geoJSON.features.map( feature => ( {
				...feature,
				properties: {
					...feature.properties,
					coords: JSON.stringify( feature.geometry.coordinates.map( c => Math.round( c * 10000 ) / 10000 ) ),
				},
			} ) ),
		},
		cluster: true,
		clusterRadius: 60,
		clusterMaxZoom: 24,
		maxzoom: 25,
		clusterProperties: {
			coords: [
				[
					"concat",
					[ "accumulated" ],
					[ "case", [ "in", [ "get", "coords" ], [ "accumulated" ] ], "", [ "get", "coords" ] ],
				],
				[ "get", "coords" ],
			],
		},
	} );

	map.addLayer( {
		id: 'clusters',
		type: 'circle',
		source: 'checkins',
		filter: [ 'has', 'point_count' ],
		paint: {
			'circle-radius': [
				'interpolate',
				[ 'linear' ],
				[ 'get', 'point_count' ],
				2, 10,
				8000, 40,
			],
			'circle-color': [
				'interpolate-lab',
				[ 'linear' ],
				[ 'get', 'point_count' ],
				2, '#66f',
				2000, '#f66',
			],
			'circle-opacity': 0.8,
			'circle-stroke-width': 1,
			'circle-stroke-color': '#000',
			'circle-stroke-opacity': .35,
		},
	} );

	map.addLayer( {
		id: 'cluster-count',
		type: 'symbol',
		source: 'checkins',
		filter: [ 'has', 'point_count' ],
		layout: {
			'text-field': '{point_count_abbreviated}',
			'text-font': [ 'Noto Sans Regular' ],
			'text-size': 12,
		},
		paint: {
			'text-color': '#fff',
		}
	} );

	map.addLayer( {
		id: 'points',
		type: 'circle',
		source: 'checkins',
		filter: [ '!', [ 'has', 'point_count' ] ],
		paint: {
			'circle-radius': 8,
			'circle-color': '#39f',
			'circle-stroke-width': 2,
			'circle-stroke-color': '#fff',
		},
	} );

	map.on( 'mouseenter', 'points', async function ( e ) {
		map.getCanvas().style.cursor = 'pointer';
	} );
	map.on( 'mouseleave', 'points', async function ( e ) {
		map.getCanvas().style.cursor = '';
	} );
	map.on( 'click', 'points', async function ( e ) {
		const features = map.queryRenderedFeatures( e.point, {
			layers: [ 'points' ]
		} );

		const venueCounts = features.reduce( ( venueCounts, feature ) => ( {
			...venueCounts,
			[feature.properties.venue_id]: 1 + ( venueCounts[feature.properties.venue_id] || 0 )
		} ), {} );
		console.log( venueCounts );
	} );

	map.on( 'mouseenter', 'clusters', async function ( e ) {
		map.getCanvas().style.cursor = 'pointer';

		const features = map.queryRenderedFeatures( e.point, {
			layers: [ 'clusters' ]
		} );

		const clusterId = features[0].properties.cluster_id;

		const coords = JSON.parse( '[' + features[0].properties.coords.replaceAll( '][', '],[' ) + ']' );
		const turfPoints = coords.map( coord => turf.point( coord ) );
		const turfFeatures = turf.featureCollection( turfPoints );
		const polygon = turf.convex( turfFeatures );

		const outline = {
			type: 'geojson',
			data: polygon,
		};

		if ( ! polygon ) {
			return;
		}

		map.addSource( 'clusteroutline', outline );

		map.addLayer( {
			id: 'clusteroutline',
			type: 'line',
			source: 'clusteroutline',
			paint: {
				'line-width': 3,
				'line-color': [ "rgba", 64, 96, 255, 0.8 ],
			},
			layout: {
				'line-join': 'round',
			}
		}, 'clusters' );
	} );
	map.on( 'mouseleave', 'clusters', async function ( e ) {
		map.getCanvas().style.cursor = '';

		if ( map.getLayer( 'clusteroutline' ) ) {
			map.removeLayer( 'clusteroutline' );
		}
		if ( map.getSource( 'clusteroutline' ) ) {
			map.removeSource( 'clusteroutline' );
		}
	} );
	map.on( 'click', 'clusters', async function ( e ) {
		const features = map.queryRenderedFeatures( e.point, {
			layers: [ 'clusters' ]
		} );

		const allCoords = features[0].properties.coords;
		const clusterId = features[0].properties.cluster_id;

		if ( ( allCoords.match( /]/g ) || [] ).length < 2 ) {
			const leaves = await map.getSource( 'checkins' ).getClusterLeaves( clusterId, Infinity );
			const venueCounts = leaves.reduce( ( venueCounts, leaf ) => ( {
				...venueCounts,
				[leaf.properties.venue_id]: 1 + ( venueCounts[leaf.properties.venue_id] || 0 )
			} ), {} )
			console.log( venueCounts );
			return;
		}

		const clusterOutline = map.getSource( 'clusteroutline' );

		if ( clusterOutline ) {
			const data = await clusterOutline.getData();
			const bounds = data.geometry.coordinates[0].reduce( ( bounds, coords ) => bounds.extend( coords ), new maplibregl.LngLatBounds() );
			// Rather than use map.fitBounds(), calculate zoom difference ahead of time to adjust speed
			// then use map.flyTo()
			const padding = 20;
			const { center, zoom } = map.cameraForBounds( bounds, { padding } );
			const currentZoom = map.getZoom();
			// Speed could be tweaked, but using the difference gives decent results.
			map.flyTo( { center, zoom, speed: Math.abs( zoom - currentZoom ), padding } );
		} else {
			const zoom = await map.getSource( 'checkins' ).getClusterExpansionZoom( clusterId );
			map.easeTo( {
				center: features[0].geometry.coordinates,
				zoom,
			} );
		}
	});
	map.on( 'zoomstart', () => {
		map.setLayoutProperty( 'cluster-count', 'visibility', 'none' );
	} );
	map.on( 'zoomend', () => {
		map.setLayoutProperty( 'cluster-count', 'visibility', 'visible' );
		if ( map.getLayer( 'clusteroutline' ) ) {
			map.removeLayer( 'clusteroutline' );
		}
		if ( map.getSource( 'clusteroutline' ) ) {
			map.removeSource( 'clusteroutline' );
		}
	} );

	return map.getSource( source );
}
