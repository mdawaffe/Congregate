(function(window, document, history) {
	const checkins = fetch( './checkins.geo.json' );
	let checkinData;

	const outputCheckins = document.getElementById( 'stats-checkins' );
	const outputVenues = document.getElementById( 'stats-venues' );
	const outputLocations = document.getElementById( 'stats-locations' );
	const outputLocationsLabel = document.getElementById( 'label-locations' );
	let locationParameter = 'country';

	const locations = new Map;

	function normalize( string ) {
		return string.normalize( 'NFKD' ).toLowerCase().replace( /\s+/g, ' ' ).replace( /[^a-z0-9 ]/g, '' );
	}

	function formatDate( dateString ) {
		// Temporal cannot come soon enough.
		const tz = dateString.slice( -6 );
		const hours = parseInt( tz, 10 );
		const sign = hours < 0 ? -1 : 1;
		const minutes = parseInt( tz.slice( -2 ), 10 );

		const local = ( new Date( Date.parse( dateString ) + sign * ( Math.abs( hours ) * 60 * 60 + minutes * 60 ) * 1000 ) );

		return [
			local.toLocaleString( undefined, { year: 'numeric', timeZone: 'UTC' } ),
			'/',
			local.toLocaleString( undefined, { month: '2-digit', timeZone: 'UTC' } ),
			'/',
			local.toLocaleString( undefined, { day: '2-digit', timeZone: 'UTC' } ),
			' ',
			local.toLocaleString( undefined, { hour: 'numeric', minute: 'numeric', timeZone: 'UTC' } ),
		].join( '' );
	}

	function matches( needle, haystack ) {
		if ( ! haystack.includes( needle ) ) {
			return false;
		}

		const matcher = new RegExp( '\\b' + needle + '\\b' )

		return matcher.test( haystack );
	}

	async function forCheckinData() {
		if ( ! checkinData ) {
			checkinData = await ( await checkins ).json();
			window.checkins = checkinData;
		}
	}

	const stateList = document.getElementById( 'states' );
	async function filteredCheckins() {
		await forCheckinData();

		const venue = normalize( form.venue.value );
		const venueRegExp = venue ? new RegExp( '\\b' + venue + '\\b' ) : null;
		const start = form.start.valueAsNumber ? form.start.valueAsNumber : null;
		const end = form.end.valueAsNumber ? form.end.valueAsNumber + 24 * 60 * 60 * 1000 : null;
		const category = form.category.value;
		const sticker = form.sticker.value.replace( /[^\x00-xFF]/g, '' ).trim();
		const country = form.country.value;
		const state = form.state.value;
		const city = normalize( form.city.value );
		const missed = form.missed.checked;
		const private = form.private.checked;
		const event = form.event.checked;
		const overlaps = form.overlaps.checked;
		const becameMayor = form.mayor.checked;
		const unlockedSticker = form['unlocked-sticker'].checked;
		const photos = form.photos.checked;
		const posts = form.posts.checked;
		const likes = form.likes.checked;
		const comments = form.comments.checked;

		const states = new Map;

		const filtered = checkinData.filter( checkin => {
			let date = new Date( checkin.properties.date.split( 'T' )[0] );

			if ( country ) {
				const checkinCountry = checkin.properties.location.country || '-NONE-';
				if ( checkinCountry !== country ) {
					return false;
				} else if ( stateList.dataset.country !== country ) {
					if ( checkin.properties.location.state ) {
						states.set( checkin.properties.location.state.id, checkin.properties.location.state.name );
					} else {
						states.set( '-NONE-', '' );
					}
				}
			}

			if ( state ) {
				if ( '-NONE-' === state ) {
					if ( checkin.properties.location.state ) {
						return false;
					}
				} else {
					if ( ! checkin.properties.location.state || checkin.properties.location.state.id !== state ) {
						return false;
					}
				}
			}

			if ( city ) {
				if ( ! checkin.properties.location.city || normalize( checkin.properties.location.city ) !== city ) {
					return false;
				}
			}

			if ( venue ) {
				const name = normalize( checkin.properties.name );
				if ( ! name.includes( venue ) ) {
					return false;
				}

				if ( ! venueRegExp.test( name ) ) {
					return false;
				}
			}

			if ( start && date < start ) {
				return false;
			}

			if ( end && end <= date ) {
				return false;
			}

			if ( category && ! checkin.properties.categories.some( cat => cat.name === category ) ) {
				return false;
			}

			if ( sticker && ( ! checkin.properties.sticker || checkin.properties.sticker.name !== sticker ) ) {
				return false;
			}

			if ( missed && ! checkin.properties.missed ) {
				return false;
			}

			if ( private && ! checkin.properties.private ) {
				return false;
			}

			if ( event && ! checkin.properties.event ) {
				return false;
			}

			if ( overlaps && ! checkin.properties.overlaps.count ) {
				return false;
			}

			if ( becameMayor && ! checkin.properties.became_mayor ) {
				return false;
			}

			if ( unlockedSticker && ! checkin.properties.unlocked_stickers ) {
				return false;
			}

			if ( photos && ! checkin.properties.photos.length ) {
				return false;
			}

			if ( posts && ! checkin.properties.posts.length ) {
				return false;
			}

			if ( likes && ! checkin.properties.likes.count ) {
				return false;
			}

			if ( comments && ! checkin.properties.comments.length ) {
				return false;
			}

			return true;
		} );

		if ( country ) {
			form.state.disabled = false;
			form.city.disabled = false;
			if ( country !== stateList.dataset.country ) {
				stateList.dataset.country = country;
				stateList.replaceChildren();
				if ( states.size > ( states.has( '-NONE-' ) ? 1 : 0 ) ) {
					Array.from( states.entries() ).sort( ( a, b ) => ( a[1] || '' ).localeCompare( b[1] || '' ) ).forEach( ( [ id, name ] ) => {
						const option = document.createElement( 'option' );
						option.value = id;
						if ( name && name !== id ) {
							option.textContent = name;
						}
						stateList.appendChild( option );
					} );
				} else {
					form.state.disabled = true;
				}
			}
		} else {
			stateList.dataset.country = false;
			form.state.disabled = true;
			form.city.disabled = true;
			form.state.value = '';
			form.city.value = '';
			stateList.replaceChildren();
		}

		return filtered;
	}

	const map = L.map('map').setView([0, 0], 2);
	L.tileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	}).addTo(map);

	let currentPage = 1;
	const list = document.querySelector( '#list' );

	const form = document.querySelector( 'form' );

	form.addEventListener( 'submit', event => {
		event.preventDefault();
	} );

	const clusterGroup = L.markerClusterGroup( { chunkedLoading: true } );

	const checkinCardTemplate = document.getElementById( 'checkin-card' );
	const infoCardTemplate = document.getElementById( 'info-card' );
	const statsCardTemplate = document.getElementById( 'stats-card' );

	function renderCard( checkin ) {
		const content = checkinCardTemplate.content.cloneNode( true );

		const title = content.querySelector( 'h2 span' );
		if ( checkin.properties.private ) {
			title.parentNode.classList.add( 'private' );
		}
		if ( checkin.properties.became_mayor ) {
			title.parentNode.classList.add( 'mayor' );
		}
		if ( checkin.properties.hierarchy ) {
			title.title = [ checkin.properties.name, ...checkin.properties.hierarchy ].join( ' \u2190 ' );
		}
		const titleLink = title.querySelector( 'a' );
		titleLink.textContent = checkin.properties.name;
		titleLink.href = './?id=' + checkin.properties.id;
		titleLink.dataset.checkin = checkin.properties.id;
		titleLink.dataset.venue = checkin.properties.venue_id;
		titleLink.dataset.users = checkin.properties.stats.users.toLocaleString();
		titleLink.dataset.checkins = checkin.properties.stats.checkins.toLocaleString();

		if ( checkin.properties.parent ) {
			title.append( ` at ${checkin.properties.parent}` );
		}

		const sticker = content.querySelector( 'img.sticker' );
		if ( checkin.properties.sticker ) {
			sticker.src = checkin.properties.sticker.icon;
			sticker.title = checkin.properties.sticker.name;
		} else {
			sticker.remove();
		}

		const categories = content.querySelector( 'ul.categories' );
		if ( checkin.properties.categories.length ) {
			const liSource = categories.querySelector( 'li' );
			liSource.remove();

			for ( let category of checkin.properties.categories ) {
				const li = liSource.cloneNode( true );
				li.querySelector( 'img' ).src = category.icon.replace('64.png', '120.png');
				categories.appendChild( li );
			}
		} else {
			categories.remove();
		}

		const location = content.querySelector( '.location' );
		location.querySelector( 'summary span' ).textContent = Array.from( new Set( [
			checkin.properties.location.city,
			checkin.properties.location.state && checkin.properties.location.state.id,
			checkin.properties.location.country,
		].filter( l => l ) ) ).join( ', ' );
		location.querySelector( 'p' ).textContent = checkin.properties.location.formatted.join( "\n" );

		const time = content.querySelector( 'time' );
		time.dateTime = checkin.properties.date;
		time.textContent = formatDate( checkin.properties.date );
		if ( checkin.properties.missed ) {
			time.className = 'missed';
		}

		const event = content.querySelector( '.event' );
		if ( checkin.properties.event ) {
			event.textContent = checkin.properties.event.name;
		} else {
			event.remove();
		}

		const photos = content.querySelector( 'ul.photos' );
		if ( checkin.properties.photos.length ) {
			const liSource = photos.querySelector( 'li' );
			liSource.remove();

			for ( let photo of checkin.properties.photos ) {
				const li = liSource.cloneNode( true );
				li.querySelector( 'a' ).href = photo;
				li.querySelector( 'img' ).src = photo;
				photos.appendChild( li );
			}
		} else {
			photos.remove();
		}

		const overlaps = content.querySelector( '.overlaps' );
		if ( checkin.properties.overlaps.count ) {
			overlaps.querySelector( 'p' ).textContent = checkin.properties.overlaps.summary ?? '';
			const short = overlaps.querySelector( '.short' );
			const shortLiSource = short.querySelector( 'li' );
			const long = overlaps.querySelector( '.long' );
			const longLiSource = long.querySelector( 'li.overlap' );
			shortLiSource.remove();
			longLiSource.remove();

			for ( let overlap of checkin.properties.overlaps.items.reverse() ) {
				const shortLi = shortLiSource.cloneNode( true );
				const shortImg = shortLi.querySelector( 'img' );
				shortImg.src = overlap.author.photo;
				shortImg.title = overlap.author.name;
				short.prepend( shortLi );

				const longLi = longLiSource.cloneNode( true );
				const longImg = longLi.querySelector( 'img' );
				longImg.src = overlap.author.photo;
				longImg.title = overlap.author.name;

				longLi.querySelector( 'span' ).textContent = overlap.author.name;

				const time = longLi.querySelector( 'time' );
				time.dateTime = overlap.date;
				time.textContent = formatDate( overlap.date );

				const q = longLi.querySelector( 'q' );
				if ( overlap.text ) {
					q.textContent = overlap.text;
				} else {
					q.remove();
				}

				const overlapPhotos = longLi.querySelector( 'ul' );
				if ( overlap.photos.length ) {
					const photoLiSource = overlapPhotos.querySelector( 'li' );
					photoLiSource.remove();
					for ( let overlapPhoto of overlap.photos ) {
						const li = photoLiSource.cloneNode( true );
						li.querySelector( 'a' ).href = overlapPhoto;
						li.querySelector( 'img' ).src = overlapPhoto;
						overlapPhotos.appendChild( li );
					}
				} else {
					overlapPhotos.remove();
				}

				long.prepend( longLi );
			}
		} else {
			overlaps.remove();
		}

		const text = content.querySelector( 'blockquote' );
		if ( checkin.properties.text ) {
			text.textContent = checkin.properties.text;
		} else {
			text.remove();
		}

		const unlockedStickers = content.querySelector( '.unlocked-stickers' );
		if ( checkin.properties.unlocked_stickers && checkin.properties.unlocked_stickers.length ) {
			const liSource = unlockedStickers.querySelector( 'li' );
			liSource.remove();

			for ( let unlockedSticker of checkin.properties.unlocked_stickers ) {
				const li = liSource.cloneNode( true );
				const img = li.querySelector( 'img' );
				img.src = unlockedSticker.icon;
				img.title = unlockedSticker.name;
				li.querySelector( 'span' ).textContent = unlockedSticker.text;
				unlockedStickers.appendChild( li );
			}
		} else {
			unlockedStickers.remove();
		}

		const likes = content.querySelector( '.likes' );
		if ( checkin.properties.likes.count ) {
			likes.textContent = checkin.properties.likes.summary;
		} else {
			likes.remove();
		}

		const comments = content.querySelector( '.comments' );
		if ( checkin.properties.comments.length ) {
			const liSource = comments.querySelector( 'li' );
			liSource.remove();

			for ( let comment of checkin.properties.comments ) {
				const li = liSource.cloneNode( true );
				li.querySelector( 'img' ).src = comment.author.photo;
				li.querySelector( 'span' ).textContent = comment.author.name;

				const time = li.querySelector( 'time' );
				time.dateTime = comment.date;
				time.textContent = formatDate( comment.date );

				li.querySelector( 'q' ).textContent = comment.text;
				comments.appendChild( li );
			}
		} else {
			comments.remove();
		}

		const posts = content.querySelector( '.posts' );
		if ( checkin.properties.posts.length ) {
			const liSource = posts.querySelector( 'li' );
			liSource.remove();

			for ( let post of checkin.properties.posts ) {
				const li = liSource.cloneNode( true );
				li.querySelector( 'img' ).src = post.source.icon;
				const source = li.querySelector( '.source' );
				source.href = post.source.url;
				source.textContent = post.source.name;

				const time = li.querySelector( 'time' );
				time.dateTime = post.date;
				time.textContent = formatDate( post.date );

				const text = li.querySelector( 'q' );
				const link = text.querySelector( 'a' );
				if ( post.url ) {
					link.textContent = post.text ?? 'Link';
					link.href = post.url;
				} else {
					if ( post.text ) {
						link.remove();
						text.textContent = post.text;
					} else {
						text.remove();
					}
				}

				posts.appendChild( li );
			}
		} else {
			posts.remove();
		}

		const scores = content.querySelector( '.scores' );
		if ( ( checkin.properties.score?.scores ?? [] ).length || ( checkin.properties.score?.total ?? 0 ) > 0 ) {
			scores.querySelector( 'summary span' ).textContent = ( checkin.properties.score?.total ?? 0 ).toLocaleString();

			const liSource = scores.querySelector( 'li' );
			const ul = liSource.parentNode;
			liSource.remove();

			for ( let score of checkin.properties.score?.scores ?? [] ) {
				const li = liSource.cloneNode( true );
				li.querySelector( 'img' ).src = score.icon;
				li.querySelector( 'q' ).textContent = score.message;
				li.querySelector( 'span' ).textContent = `+${score.points.toLocaleString()}`;

				ul.appendChild( li );
			}
		} else {
			scores.remove();
		}

		return content;
	}

	// search event fires when search field changes or when the search input's clear control is clicked
	// change event fires when search field changes
	// debounce that search+change event
	let allowRender = true;
	async function renderPoints( id ) {
		if ( ! allowRender ) {
			return;
		}

		allowRender = false;
		window.setTimeout( () => allowRender = true );

		const points = await filteredCheckins();
		const venues = new Set;
		locations.clear();
		let locationSource = 'country';
		let locationLabel = 'Countries';
		locationParameter = 'country';

		if ( form.country.value ) {
			if ( form.state.value || form.state.disabled ) {
				locationSource = 'city';
				locationLabel = 'Cities';
				locationParameter = 'city';
			} else {
				locationSource = 'state';
				locationLabel = 'States';
				locationParameter = 'state';
			}
		}
		for ( let point of points ) {
			venues.add( point.properties.venue_id );
			const location = point.properties.location[locationSource]?.name ?? point.properties.location[locationSource]?.id ?? point.properties.location[locationSource];
			locations.set( location, ( locations.get( location ) ?? 0 ) + 1 );
		}

		outputCheckins.textContent = points.length.toLocaleString();
		outputVenues.textContent = venues.size.toLocaleString();
		outputLocations.textContent = locations.size.toLocaleString();
		outputLocationsLabel.textContent = locationLabel;

		clusterGroup.clearLayers();
		list.replaceChildren();

		if ( 'view-map' === document.body.className ) {
			renderMap( points, id );
		} else {
			renderList( points, id );
		}
	}

	function renderMap( points, id ) {
		let selected;
		const layer = L.geoJson(
			points,
			{
				onEachFeature: ( feature, marker ) => {
					marker.bindPopup( () => renderCard( feature ), {
						minWidth: 305,
						maxWidth: 305,
					} );
					if ( id && feature.properties.id === id ) {
						selected = marker;
					}
				},
			}
		);
		// It might be more performant to do clusterGroup.addLayers( points.getLayers() ).
		clusterGroup.addLayer( layer );
		if ( selected ) {
			clusterGroup.zoomToShowLayer( selected, () => selected.openPopup() );
		} else if ( points.length ) {
			map.fitBounds( clusterGroup.getBounds() );
		}
	}

	function renderList( points, id ) {
		if ( id ) {
			points = points.filter( point => id === point.properties.id );
		}

		const start = ( currentPage - 1 ) * 12;
		const displayPoints = points.slice( start, start + 12 );

		for ( let point of displayPoints ) {
			const article = document.createElement( 'article' );
			article.appendChild( renderCard( point ) );
			list.appendChild( article );
		}

		const links = document.createElement( 'ol' );
		links.className = 'pages';
		const pageNumbers = 1 === currentPage ? [] : [ '-1' ];
		const lastPage = Math.ceil( points.length / 12 ) || 1;
		for ( let i = 0, l = points.length; i * 12 < l; i++ ) {
			const page = i + 1;
			if ( page < currentPage - 2 && 1 !== page ) {
				continue;
			}

			if ( currentPage + 2 < page && lastPage !== page ) {
				continue;
			}

			const previous = pageNumbers[pageNumbers.length - 1] ?? 0;
			if ( 0 < previous && previous != page - 1 ) {
				pageNumbers.push( '\u22EF' );
			}
			pageNumbers.push( page.toString() );
		}
		if ( currentPage !== lastPage ) {
			pageNumbers.push( '+1' );
		}

		for ( let pageNumber of pageNumbers ) {
			const li = document.createElement( 'li' );
			if ( pageNumber === currentPage.toString() || '\u22EF' === pageNumber ) {
				li.textContent = pageNumber;
			} else {
				const a = document.createElement( 'a' );
				a.href = `#${pageNumber}`;
				switch ( pageNumber ) {
					case '-1' :
						a.textContent = '\u2B05\uFE0F';
						break;
					case '+1' :
						a.textContent = '\u27A1\uFE0F';
						break;
					default :
						a.textContent = pageNumber;
						break;
				}
				li.appendChild( a );
			}
			links.appendChild( li );
		}

		list.appendChild( links );
	}

	const info = document.getElementById( 'info' );

	function renderInfo( checkinID, venueID, userCount, checkinCount ) {
		const content = infoCardTemplate.content.cloneNode( true );
		const visitedCount = checkinData.filter( checkin => checkin.properties.venue_id === venueID ).length;

		const link = content.querySelector( '.url-checkin' );
		link.href += encodeURIComponent( checkinID );

		const checkinLink = content.querySelector( '.url-swarm-checkin' );
		checkinLink.href += encodeURIComponent( checkinID );

		const checkinButton = content.querySelector( '.clipboard-checkin' );
		checkinButton.dataset.source = checkinID;

		const venueLink = content.querySelector( '.url-foursquare-venue' );
		venueLink.href += encodeURIComponent( venueID );

		const venueButton = content.querySelector( '.clipboard-venue' );
		venueButton.dataset.source = venueID;


		content.querySelector( '.count-visited' ).textContent = visitedCount.toLocaleString();
		content.querySelector( '.count-users' ).textContent = userCount;
		content.querySelector( '.count-checkins' ).textContent = checkinCount;

		info.replaceChildren( content );
	}

	const stats = document.getElementById( 'stats' );

	function renderStats( locations ) {
		const content = statsCardTemplate.content.cloneNode( true );

		const list = content.querySelector( 'dl' );
		const locationsAlphabatized = [ ...locations.keys() ].toSorted();
		for ( const location of locationsAlphabatized ) {
			const dt = document.createElement( 'dt' );
			const link = document.createElement( 'a' );
			link.textContent = location;
			const currentURL = new URL( document.location.href );
			const locationID = [ ...states.querySelectorAll( 'option' ) ].find( option => option.textContent == location )?.value ?? location;
			currentURL.searchParams.append( locationParameter, locationID );
			link.href = currentURL.toString();
			dt.appendChild( link );
			const dd = document.createElement( 'dd' );
			dd.textContent = locations.get( location ).toLocaleString();
			list.appendChild( dt );
			list.appendChild( dd );
		}

		stats.replaceChildren( content );
	}

	function serializeForm( form ) {
		return new URLSearchParams( Array.from( new FormData( form ).entries() ).filter( ( [ key, value ] ) => value.length ) ).toString();
	}

	let hydrating = false;
	function hydrateForm( form, query ) {
		hydrating = true;
		const elements = form.elements;
		form.reset();

		const isInit = query ? false : true;
		if ( isInit ) {
			query = new URLSearchParams( document.location.search.slice( 1 ) );
		}

		for ( const [ key, value ] of query ) {
			if ( ! elements[key] ) {
				continue;
			}

			switch ( elements[key].type ) {
				case 'checkbox' :
					elements[key].checked = true;
					break;
				default :
					elements[key].value = value;
					break;
			}
		}
		hydrating = false;
		if ( ! isInit ) {
			processForm();
		}
	}

	async function processForm() {
		if ( hydrating ) {
			return;
		}

		currentPage = 1;
		await renderPoints();
		const queryString = serializeForm( form );
		if ( document.location.search.slice( 1 ) === queryString ) {
			return;
		}
		history.pushState( {}, '', '?' + queryString );
	}

	async function clipboardWrite( text ) {
		const type = 'text/plain';
		const blob = new Blob( [ text ], { type } );
		const data = new ClipboardItem( { [type]: blob } );
		await navigator.clipboard.write( [ data ] );
	}

	form.addEventListener( 'change', processForm );
	form.addEventListener( 'search', processForm );
	form.addEventListener( 'reset', event => {
		if ( hydrating ) {
			return;
		}
		// The form is still filled.
		window.setTimeout( async function() {
			// Now the form is empty.
			await processForm( event );
		} );
	} );

	document.body.addEventListener( 'click', event => {
		if ( event.target.matches( 'h2 a' ) ) {
			event.preventDefault();
			renderInfo( event.target.dataset.checkin, event.target.dataset.venue, event.target.dataset.users, event.target.dataset.checkins );
			info.showPopover();
			return;
		}

		if ( event.target.matches( '#stats-locations' ) ) {
			event.preventDefault();
			renderStats( locations );
			stats.showPopover();
			return;
		}

		if ( event.target.matches( '#stats a' ) ) {
			event.preventDefault();
			const targetURL = new URL( event.target.href );
			form[locationParameter].value = targetURL.searchParams.get( locationParameter );
			processForm();
			stats.hidePopover();
			return;
		}

		if ( event.target.matches( '.clipboard' ) ) {
			event.preventDefault();
			clipboardWrite( event.target.dataset.source );
			return;
		}

		if ( event.target.matches( 'nav button' ) ) {
			document.body.className = event.target.id;
			currentPage = 1;
			renderPoints();
			return;
		}

		if ( event.target.matches( '.pages a' ) ) {
			event.preventDefault();
			const nextPage = event.target.hash.slice( 1 );
			switch ( nextPage ) {
				case '-1' :
					currentPage--;
					break;
				case '+1' :
					currentPage++;
					break;
				default :
					currentPage = parseInt( nextPage, 10 );
					break;
			}
			renderPoints();
			return;
		}

		if ( event.target.matches( '.overlaps .short a' ) ) {
			event.preventDefault();
			event.target.closest( '.overlaps' ).className = 'overlaps long';
			return;
		} else if ( event.target.matches( '.overlaps .long a' ) ) {
			event.preventDefault();
			event.target.closest( '.overlaps' ).className = 'overlaps short';
			return;
		}
	} );

	window.addEventListener( 'DOMContentLoaded', async (event) => {
		const query = new URLSearchParams( document.location.search.slice( 1 ) );
		const id = query.get( 'id' );

		map.addLayer( clusterGroup );

		if ( id ) {
			await renderPoints( id );
		} else {
			if ( query.toString().length ) {
				hydrateForm( form );
			}
			await renderPoints();
		}

		const lists = {
			categories: new Set,
			countries: new Set,
		};

		const stickerMap = new Map;

		await forCheckinData();
		for ( let checkin of checkinData ) {
			checkin.properties.categories.forEach( category => lists.categories.add( category.name ) );
			lists.countries.add( checkin.properties.location.country || '-NONE-' );
			if ( checkin.properties.sticker ) {
				stickerMap.set( checkin.properties.sticker.name, checkin.properties.sticker.emoji );
			}
		}

		for ( let [ listName, listItems ] of Object.entries( lists ) ) {
			const list = document.getElementById( listName );
			Array.from( listItems.values() ).sort().forEach( value => {
				const option = document.createElement( 'option' );
				option.value = value;
				list.appendChild( option );
			} );
		}

		const list = document.getElementById( 'stickers' );
		for ( let [ name, emoji ] of Array.from( stickerMap.entries() ).sort( ( a, b ) => a[0].localeCompare( b[0] ) ) ) {
				const option = document.createElement( 'option' );
				option.value = `${emoji} ${name}`;
				list.appendChild( option );
		}
	});

	window.addEventListener( 'popstate', event => {
		hydrateForm( form, new URLSearchParams( document.location.search.slice( 1 ) ) );
	} );
})(window, document, history);
