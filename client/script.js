import { GeoMap } from './map.js';
import { Form } from './form.js';
import {
	countryFlag,
	formatCountry,
	formatDate,
} from './formatting.js';

function forEvent( object, eventName ) {
	return new Promise( resolve => {
		const resolveEvent = function( event ) {
			object.removeEventListener( eventName, resolveEvent );
			resolve( event );
		}
		object.addEventListener( eventName, resolveEvent );
	} );
}

function normalize( string ) {
	return string.normalize( 'NFKD' ).toLowerCase().replace( /\s+/g, ' ' ).replace( /[^a-z0-9 ]/g, '' );
}

function matches( needle, haystack ) {
	if ( ! haystack.includes( needle ) ) {
		return false;
	}

	const matcher = new RegExp( '\\b' + needle + '\\b' )

	return matcher.test( haystack );
}

const venueIdRegExp = new RegExp( '^id:[0-9a-f]{24}$' );

function filterForBbox( state, checkins ) {
	if ( ! state.bbox ){
		return checkins;
	}

	const bbox = map.boundsFromBbox( state.bbox );

	return checkins.filter( checkin => bbox.contains( checkin.geometry.coordinates ) );
}

function filteredCheckins( state, checkins ) {
	const venueId = state.venue && venueIdRegExp.test( state.venue ) && state.venue.slice( 3 );
	const venue = normalize( state.venue );
	const venueRegExp = venue ? new RegExp( '\\b' + venue + '\\b' ) : null;
	const text = state.text.length ? state.text.toLowerCase() : null;
	const start = state.startAsNumber ? state.startAsNumber : null;
	const end = state.endAsNumber ? state.endAsNumber + 24 * 60 * 60 * 1000 : null;
	const category = state.category;
	const sticker = state.sticker.replace( /[^\x00-xFF]/g, '' ).trim();
	const country = state.country.replace( /\p{Regional_Indicator}/ug, '' ).trim();
	const province = state.state;
	const city = normalize( state.city );
	const missed = state.missed;
	const isPrivate = state.private;
	const event = state.event;
	const overlaps = state.overlaps;
	const becameMayor = state.mayor;
	const unlockedSticker = state['unlocked-sticker'];
	const photos = state.photos;
	const posts = state.posts;
	const likes = state.likes;
	const comments = state.comments;
	const source = state.source;
	const month = state.month;
	const date = state.date;
	const dow = state.dow;

	const filtered = checkins.filter( checkin => {
		const checkinDate = new Date( checkin.properties.date.split( 'T' )[0] );

		if ( country ) {
			const checkinCountry = formatCountry( checkin.properties.location?.country );
			if ( checkinCountry !== country ) {
				return false;
			}
		}

		if ( province ) {
			if ( '-NONE-' === province ) {
				if ( checkin.properties.location.state ) {
					return false;
				}
			} else {
				if ( ! checkin.properties.location.state || checkin.properties.location.state.id !== province ) {
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
			if ( venueId ) {
				if ( checkin.properties.venue_id !== venueId ) {
					return false;
				}
			} else {
				const name = normalize( checkin.properties.name );
				if ( ! name.includes( venue ) ) {
					return false;
				}

				if ( ! venueRegExp.test( name ) ) {
					return false;
				}
			}
		}

		if ( text ) {
			if ( null === checkin.properties.text || ! checkin.properties.text.toLowerCase().includes( text ) ) {
				return false;
			}
		}

		if ( start && checkinDate < start ) {
			return false;
		}

		if ( end && end <= checkinDate ) {
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

		if ( isPrivate && ! checkin.properties.private ) {
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

		if ( source && checkin.properties.source !== source ) {
			return false;
		}

		if ( month.length && checkinDate.getUTCMonth() !== parseInt( month ) ) {
			return false;
		}

		if ( date.length && checkinDate.getUTCDate() !== parseInt( date ) ) {
			return false;
		}

		if ( dow.length && checkinDate.getUTCDay() !== parseInt( dow ) ) {
			return false;
		}

		return true;
	} );

	return filtered;
}

function renderCard( checkin ) {
	const content = templates.checkin.content.cloneNode( true );

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
	let currentURL = new URL( document.location.href );
	currentURL.searchParams.set( 'venue', 'id:' + checkin.properties.venue_id );
	currentURL.searchParams.delete( 'page' );
	titleLink.href = currentURL.toString();

	const infoButton = content.querySelector( '.info' );
	infoButton.dataset.checkin = checkin.properties.id;
	infoButton.dataset.venue = checkin.properties.venue_id;
	infoButton.dataset.users = checkin.properties.stats.users.toLocaleString();
	infoButton.dataset.checkins = checkin.properties.stats.checkins.toLocaleString();

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

		for ( const category of checkin.properties.categories ) {
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
		formatCountry( checkin.properties.location?.country ),
	].filter( l => l ) ) ).join( ', ' );
	location.querySelector( 'p' ).textContent = checkin.properties.location.formatted.join( "\n" );

	const time = content.querySelector( 'time' );
	const dateLink = time.querySelector( 'a' );
	time.dateTime = checkin.properties.date;
	const [ datePart, ...timeParts ] = formatDate( checkin.properties.date ).split( ' ' );
	dateLink.textContent = datePart;
	currentURL = new URL( document.location.href );
	currentURL.searchParams.set( 'start', datePart.replaceAll( '/', '-' ) );
	currentURL.searchParams.set( 'end', datePart.replaceAll( '/', '-' ) );
	currentURL.searchParams.delete( 'page' );
	dateLink.href = currentURL.toString();
	time.append( ' ', timeParts.join( ' ' ) );
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

		for ( const photo of checkin.properties.photos ) {
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

		for ( const overlap of checkin.properties.overlaps.items.toReversed() ) {
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
				for ( const overlapPhoto of overlap.photos ) {
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

		for ( const unlockedSticker of checkin.properties.unlocked_stickers ) {
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

		for ( const comment of checkin.properties.comments ) {
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

		for ( const post of checkin.properties.posts ) {
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

		for ( const score of checkin.properties.score?.scores ?? [] ) {
			const li = liSource.cloneNode( true );
			li.querySelector( 'img' ).src = score.icon;
			li.querySelector( 'q' ).textContent = score.message;
			li.querySelector( 'span' ).textContent = ( score.multiplier ?? false )
				? `x${score.points.toLocaleString()}`
				: `+${score.points.toLocaleString()}`;

			ul.appendChild( li );
		}
	} else {
		scores.remove();
	}

	return content;
}

function renderPoints( form, { id = false, updateMap = true } = {} ) {
	const state = form.getState();
	const worldPoints = filteredCheckins( state, checkins );
	const regionPoints = filterForBbox( state, worldPoints );

	const country = state.country.replace( /\p{Regional_Indicator}/ug, '' ).trim();

	const venues = new Set;
	locations.clear();
	let locationSource = 'country';
	let locationLabel = 'Countries';
	locationParameter = 'country';

	const addVenue = ( checkin ) => {
		venues.add( checkin.properties.venue_id );
		const location = checkin.properties.location[locationSource]?.name ?? checkin.properties.location[locationSource]?.id ?? checkin.properties.location[locationSource];
		locations.set( location, ( locations.get( location ) ?? 0 ) + 1 );
	}


	const disabled = {
		state: true,
		city: true,
	}

	if ( country ) {
		const states = new Map;

		for ( const checkin of regionPoints ) {
			addVenue( checkin );

			const checkinCountry = formatCountry( checkin.properties.location?.country );
			if ( checkinCountry === country && stateList.dataset.country !== country ) {
				if ( checkin.properties.location.state ) {
					states.set( checkin.properties.location.state.id, checkin.properties.location.state.name );
				} else {
					states.set( '-NONE-', '' );
				}
			}
		}

		disabled.state = false;
		disabled.city = false;
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
				disabled.state = true;
			}
		}

		if ( state.state || disabled.state ) {
			locationSource = 'city';
			locationLabel = 'Cities';
			locationParameter = 'city';
		} else {
			locationSource = 'state';
			locationLabel = 'States';
			locationParameter = 'state';
		}
	} else {
		for ( const checkin of regionPoints ) {
			addVenue( checkin );
		}

		stateList.dataset.country = false;
		stateList.replaceChildren();
		disabled.state = true;
		disabled.city = true;
		form.update( { state: '', city: '' } );
	}

	form.disable( disabled );

	outputCheckins.textContent = regionPoints.length.toLocaleString();
	outputVenues.textContent = venues.size.toLocaleString();
	outputLocations.textContent = locations.size.toLocaleString();
	outputLocationsLabel.textContent = locationLabel;

	if ( updateMap ) {
		map.update( worldPoints, { bbox: state.bbox } );
	}

	switch ( document.body.className ) {
		case 'view-list' :
			list.replaceChildren();
			renderList( regionPoints, state.page ? parseInt( state.page, 10 ) : 1, id );
			break;
		case 'view-heat-calendar' :
			renderHeatCalendar( regionPoints );
			break;
		case 'view-histogram' :
			renderHistogram( regionPoints, state.start || null, state.end || null );
			break;
	}
}

function renderHeatCalendar( points ) {
	for ( const colHeader of outputDaysOfYear.querySelectorAll( 'thead th a' ) ) {
		const currentURL = new URL( document.location.href );
		if ( colHeader.textContent === ( currentURL.searchParams.get( 'date' ) ?? null ) ) {
			currentURL.searchParams.delete( 'date' );
		} else {
			currentURL.searchParams.set( 'date', colHeader.textContent );
		}
		colHeader.href = currentURL.toString();
	}

	for ( const rowHeader of outputDaysOfYear.querySelectorAll( 'tbody th a' ) ) {
		const currentURL = new URL( document.location.href );
		if ( rowHeader.dataset.month === ( currentURL.searchParams.get( 'month' ) ?? null ) ) {
			currentURL.searchParams.delete( 'month' );
		} else {
			currentURL.searchParams.set( 'month', rowHeader.dataset.month );
		}
		rowHeader.href = currentURL.toString();
	}

	for ( const colHeader of outputDaysOfWeek.querySelectorAll( 'thead th a' ) ) {
		const currentURL = new URL( document.location.href );
		if ( colHeader.dataset.week === ( currentURL.searchParams.get( 'dow' ) ?? null ) ) {
			currentURL.searchParams.delete( 'dow' );
		} else {
			currentURL.searchParams.set( 'dow', colHeader.dataset.week );
		}
		colHeader.href = currentURL.toString();
	}

	const dayOfYear = new Map;
	const dayOfWeek = new Map;
	for ( const point of points ) {
		const date = new Date( point.properties.date.split( 'T' )[0] );
		const ofYear = `${ date.getUTCMonth() + 1 }-${ date.getUTCDate() }`;
		const ofWeek = date.getUTCDay();
		dayOfYear.set( ofYear, ( dayOfYear.get( ofYear ) ?? 0 ) + 1 );
		dayOfWeek.set( ofWeek, ( dayOfWeek.get( ofWeek ) ?? 0 ) + 1 );
	}

	const minWeek = Math.min( ...dayOfWeek.values() );
	const maxWeek = Math.max( ...dayOfWeek.values() );
	outputDaysOfWeek.style.setProperty( '--min', minWeek );
	outputDaysOfWeek.style.setProperty( '--max', maxWeek );
	for ( let d = 0; d < 7; d++ ) {
		const count = dayOfWeek.get( d ) ?? 0;
		if ( count === 0 ) {
			outputDaysOfWeekCells[d].textContent = '';
			outputDaysOfWeekCells[d].style.setProperty( '--count', 'unset' );
		} else {
			outputDaysOfWeekCells[d].textContent = count.toLocaleString();
			outputDaysOfWeekCells[d].style.setProperty( '--count', count );
		}
	}

	const minYear = Math.min( ...dayOfYear.values() );
	const maxYear = Math.max( ...dayOfYear.values() );
	outputDaysOfYear.style.setProperty( '--min', minYear );
	outputDaysOfYear.style.setProperty( '--max', maxYear );
	for ( let m = 0; m < 12; m++ ) {
		for ( let d = 0; d < 31; d++ ) {
			const count = dayOfYear.get( `${ m + 1}-${ d + 1}` ) ?? 0;
			if ( count === 0 ) {
				outputDaysOfYearCells[m]?.[d] && ( outputDaysOfYearCells[m][d].textContent = '' );
				outputDaysOfYearCells[m]?.[d]?.style?.setProperty( '--count', 'unset' );
			} else {
				outputDaysOfYearCells[m]?.[d] && ( outputDaysOfYearCells[m][d].textContent = count.toLocaleString() );
				outputDaysOfYearCells[m]?.[d]?.style?.setProperty( '--count', count );
			}
		}
	}
}

function renderHistogram( points, startDateValue, endDateValue ) {
	const div = document.getElementById( 'histogram' );
	if ( 0 === points.length ) {
		div.dataset.max = "";
		div.replaceChildren();
		return;
	}

	let endDate;
	if ( endDateValue ) {
		endDate = new Date( endDateValue );
	} else {
		const now = new Date;
		endDate = new Date( Date.UTC( now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0 ) );
	}
	const endYear = endDate.getUTCFullYear();
	const endMonth = endDate.getUTCMonth() + 1;

	const dates = points.toReversed().map( point => point.properties.date );
	const buckets = [];
	let [ iYear, iMonth ] = ( startDateValue ?? dates[0] ).split( '-' ).map( n => parseInt( n, 10 ) );

	while ( iYear < endYear || ( iYear === endYear && iMonth <= endMonth ) ) {
		buckets.push( `${ iYear }-${ iMonth.toString().padStart( 2, '0' ) }` );
		iMonth++;
		if ( 12 < iMonth ) {
			iMonth = 1;
			iYear++;
		}
	}

	const fragment = document.createDocumentFragment();

	const currentURL = new URL( document.location.href );
	currentURL.searchParams.delete( 'page' );

	const bucketCounts = new Map;
	for ( const date of dates ) {
		const bucket = date.slice( 0, 7 );
		bucketCounts.set( bucket, ( bucketCounts.get( bucket ) ?? 0 ) + 1 );
	}
	let maxCount = 0;
	let minCount = Infinity;
	for ( const bucket of buckets ) {
		const bucketDate = new Date( `${ bucket }-01` );
		bucketDate.setUTCMonth( bucketDate.getUTCMonth() + 1, 0 );
		const count = bucketCounts.get( bucket ) ?? 0;
		maxCount = Math.max( maxCount, count );
		minCount = Math.min( minCount, count );
		const div = document.createElement( 'div' );
		div.dataset.bucket = bucket;
		div.style.setProperty( '--count', count );
		const link = document.createElement( 'a' );
		currentURL.searchParams.set( 'start', `${ bucket }-01` );
		currentURL.searchParams.set( 'end', `${ bucketDate.getUTCFullYear() }-${ ( bucketDate.getUTCMonth() + 1 ).toString().padStart( 2, '0' ) }-${ bucketDate.getUTCDate() }` );
		link.href = currentURL.toString();
		link.textContent = count.toLocaleString();
		div.append( link );
		fragment.append( div );
	}

	div.style.setProperty( '--min', minCount );
	div.style.setProperty( '--max', maxCount );
	div.dataset.max = maxCount.toLocaleString();

	div.replaceChildren( fragment );
}

function renderList( points, currentPage, id ) {
	const list = document.getElementById( 'list' );

	const listItems = document.createDocumentFragment();

	if ( id ) {
		points = points.filter( point => id === point.properties.id );
	}

	const start = ( currentPage - 1 ) * 12;
	const displayPoints = points.slice( start, start + 12 );

	for ( const point of displayPoints ) {
		const article = document.createElement( 'article' );
		article.appendChild( renderCard( point ) );
		if ( 'P' === ( point.properties.source ?? null ) ) {
			article.classList.add( 'push-only' );
		}
		listItems.appendChild( article );
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

	const currentURL = new URL( document.location.href );

	for ( const pageNumber of pageNumbers ) {
		const li = document.createElement( 'li' );
		if ( pageNumber === currentPage.toString() || '\u22EF' === pageNumber ) {
			li.textContent = pageNumber;
		} else {
			const a = document.createElement( 'a' );
			switch ( pageNumber ) {
				case '-1' :
					1 === currentPage - 1
						? currentURL.searchParams.delete( 'page' )
						: currentURL.searchParams.set( 'page', currentPage - 1 );
					a.textContent = '\u2B05\uFE0F';
					break;
				case '+1' :
					currentURL.searchParams.set( 'page', currentPage + 1 );
					a.textContent = '\u27A1\uFE0F';
					break;
				default :
					'1' === pageNumber
						? currentURL.searchParams.delete( 'page' )
						: currentURL.searchParams.set( 'page', pageNumber );
					a.textContent = pageNumber;
					break;
			}
			a.href = currentURL.toString();
			li.appendChild( a );
		}
		links.appendChild( li );
	}

	list.append( listItems, links );
}

function renderInfo( checkinID, venueID, userCount, checkinCount ) {
	const info = document.getElementById( 'info' );

	const content = templates.info.content.cloneNode( true );
	const visitedCount = checkins.filter( checkin => checkin.properties.venue_id === venueID ).length;

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

function renderStats( locations ) {
	const stats = document.getElementById( 'stats' );

	const content = templates.stats.content.cloneNode( true );

	const list = content.querySelector( 'dl' );
	const locationsAlphabatized = [ ...locations.keys() ].toSorted();
	for ( const location of locationsAlphabatized ) {
		const dt = document.createElement( 'dt' );
		const link = document.createElement( 'a' );
		link.textContent = location;
		const currentURL = new URL( document.location.href );
		const locationID = [ ...stateList.querySelectorAll( 'option' ) ].find( option => option.textContent == location )?.value ?? location;
		currentURL.searchParams.append( locationParameter, locationID );
		currentURL.searchParams.delete( 'page' );
		link.href = currentURL.toString();
		const dtContents = 'country' === locationParameter ? [ countryFlag( countries, location ), ' ', link ] : [ link ];
		dt.append( ...dtContents );
		const dd = document.createElement( 'dd' );
		dd.textContent = locations.get( location ).toLocaleString();
		list.appendChild( dt );
		list.appendChild( dd );
	}

	stats.replaceChildren( content );
}

async function clipboardWrite( text ) {
	const type = 'text/plain';
	const blob = new Blob( [ text ], { type } );
	const data = new ClipboardItem( { [type]: blob } );
	await navigator.clipboard.write( [ data ] );
}

function createStatsClick() {
	const stats = document.getElementById( 'stats' );

	// We use the toggle event to track statsOpen since the popover can change state
	// outside of the #stats-locations click event, so we can't track statsOpen in that click handler.
	// It's a popover="auto", so it can close by clicking anywhere outside the popover.
	// It's a popover="auto", so checking .open or :popover-open during the click handler is finicky since clicking
	// #stats-locations to close the popover is outside the popover, so it autocloses, changing
	// the state of .open and :popover-open before we get a chance to check them to see if we should be opening or closing.
	let statsOpen = false;
	stats.addEventListener( 'toggle', event => statsOpen = 'open' === event.newState );

	return ( event ) => {
		event.preventDefault();
		if ( statsOpen ) {
			// See above for togglePopover() + popover="auto"
			stats.hidePopover();
		} else {
			renderStats( locations );
			stats.showPopover();
		}
	};
}

function createInfoClick() {
	const info = document.getElementById( 'info' );

	// See createStatsClick()
	let lastInfo = null;
	info.addEventListener( 'toggle', event => lastInfo = 'open' === event.newState ? lastInfo : null );

	return ( event ) => {
		event.preventDefault();
		if ( event.target === lastInfo ) {
			// togglePopover() doesn't work well when triggered with a click for a popover="auto" popover.
			// If the button is outside the popover, as in this case, the popover first autocloses.
			// The toggle then opens it back up.
			info.hidePopover();
		} else {
			renderInfo( event.target.dataset.checkin, event.target.dataset.venue, event.target.dataset.users, event.target.dataset.checkins );
			info.showPopover();
			lastInfo = event.target;
		}
	};
}


await forEvent( window, 'DOMContentLoaded' );

const checkinsRequest = await fetch( './checkins/checkins.geo.json' );
const checkins = await checkinsRequest.json();

const list = document.getElementById( 'list' );

const outputCheckins = document.getElementById( 'stats-checkins' );
const outputVenues = document.getElementById( 'stats-venues' );
const outputLocations = document.getElementById( 'stats-locations' );
const outputLocationsLabel = document.getElementById( 'label-locations' );

const outputDaysOfWeek = document.getElementById( 'days-of-week' );
const outputDaysOfWeekCells = outputDaysOfWeek.querySelectorAll( 'tbody td' );
const outputDaysOfYear = document.getElementById( 'days-of-year' );
const outputDaysOfYearBody = outputDaysOfYear.querySelector( 'tbody' );
const outputDaysOfYearHead = outputDaysOfYear.querySelector( 'thead tr' );

function initializeHistogram() {
	const januaryOne = new Date( '2024-01-01' );
	let monthIndex = -1;
	let dayIndex = -1
	for ( let i = 0; i < 366; i++ ) {
		const dateIndex = new Date( januaryOne.getTime() + 1000 * 60 * 60 * 24 * i );
		const thisMonth = dateIndex.getUTCMonth();
		if ( monthIndex !== thisMonth ) {
			monthIndex = thisMonth;

			const tr = document.createElement( 'tr' );
			const thr = document.createElement( 'th' );
			const link = document.createElement( 'a' );
			link.textContent = dateIndex.toLocaleString( undefined, { month: 'short', timeZone: 'UTC' } );
			link.dataset.month = thisMonth;
			thr.scope = 'row';
			thr.append( link );
			tr.append( thr );
			outputDaysOfYearBody.append( tr );
		}

		const thisDay = dateIndex.getUTCDate();
		if ( dayIndex !== thisDay ) {
			dayIndex = thisDay;
			const td = document.createElement( 'td' );
			outputDaysOfYearBody.querySelector( 'tr:last-child' ).append( td );

			if ( thisMonth === 0 ) {
				const thc = document.createElement( 'th' );
				const link = document.createElement( 'a' );
				link.textContent = thisDay.toString();
				thc.scope = 'col';
				thc.append( link );
				outputDaysOfYearHead.append( thc );
			}
		}
	}
}

initializeHistogram();

const outputDaysOfYearCells = [...outputDaysOfYear.querySelectorAll( 'tbody tr' )].map( tr => tr.querySelectorAll( 'td' ) );

const templates = {
	checkin: document.getElementById( 'checkin-card' ),
	info: document.getElementById( 'info-card' ),
	stats: document.getElementById( 'stats-card' ),
}

let locationParameter = 'country';
const locations = new Map;

const formContainer = document.querySelector( 'form' );
const form = new Form( formContainer );
form.populateDataLists( checkins );

const stateList = formContainer.querySelector( '#states' );

const countries = form.getCountryMap();

const mapContainer = document.querySelector( '.map' );
const map = new GeoMap( mapContainer, document.getElementById( 'big-map' ) );
map.onViewChanged( ( { bbox } ) => {
	form.update( { bbox }, { updateMap: false } );
} );
map.onResize( () => {
	const currentView = document.body.className;

	if ( mapContainer.parentElement.id === 'big-map' ) {
		// If we're going big, we never need to rerender.
		// Don't call setView(), which:
		// 1. may cause loop, and
		// 2. rerenders.
		// Set the class/last manually.
		document.body.dataset.lastView = currentView;
		document.body.className = 'view-map';
		return;
	}

	// If we're going small, we always need to rerender.
	// Still avoid setView(), which might loop.
	const view = document.body.dataset.lastView ?? 'view-list';
	document.body.dataset.lastView = currentView;
	document.body.className = view === 'view-map' ? 'view-list' : view;

	renderPoints( form, { updateMap: false } );
} );

const statsClick = createStatsClick();
const infoClick = createInfoClick();

document.body.addEventListener( 'click', event => {
	if ( event.target.matches( 'h2 a' ) ) {
		event.preventDefault();
		const targetURL = new URL( event.target.href );
		form.hydrate( targetURL.searchParams );
		return;
	}

	if ( event.target.matches( '.date' ) ) {
		event.preventDefault();
		const targetURL = new URL( event.target.href );
		form.hydrate( targetURL.searchParams );
		return;
	}

	if ( event.target.matches( '.info' ) ) {
		return infoClick( event )
	}

	if ( event.target.matches( '#stats-locations' ) ) {
		return statsClick( event );
	}

	if ( event.target.matches( '#stats a' ) ) {
		event.preventDefault();
		const targetURL = new URL( event.target.href );
		form.hydrate( targetURL.searchParams );
		event.target.closest( '#stats' ).hidePopover();
		return;
	}

	if ( event.target.matches( '.clipboard' ) ) {
		event.preventDefault();
		clipboardWrite( event.target.dataset.source );
		return;
	}

	if ( event.target.matches( '.pages a' ) ) {
		event.preventDefault();
		const targetURL = new URL( event.target.href );
		form.hydrate( targetURL.searchParams );
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

	if ( event.target.matches( '.view-histogram a' ) ) {
		event.preventDefault();
		const targetURL = new URL( event.target.href );
		form.hydrate( targetURL.searchParams );
		document.body.className = document.body.dataset.lastView ?? 'view-list';
		return;
	}

	if ( event.target.matches( '.view-heat-calendar a' ) ) {
		event.preventDefault();
		const targetURL = new URL( event.target.href );
		form.hydrate( targetURL.searchParams );
		return;
	}

	if ( event.target.matches( '.views button' ) ) {
		event.preventDefault();
		setView( event.target.id );
	}
} );

function setView( view ) {
	const currentView = document.body.className;

	if ( view === currentView ) {
		return;
	}

	if ( currentView === 'view-map' || view === 'view-map' ) {
		if ( currentView === 'view-map' ) {
			document.body.dataset.lastView = view
		}
		document.querySelector( '.mdawaffe-ctrl-embiggen' ).click();
		// Let the embiggen click handler handle everything.
		return;
	}

	document.body.dataset.lastView = currentView;
	document.body.className = view;

	renderPoints( form, { updateMap: false } );
}

form.addEventListener( 'change', ( event ) => {
	renderPoints( event.target, event.detail.args );
} );

const query = new URLSearchParams( document.location.search.slice( 1 ) );
const id = query.get( 'id' );

if ( id ) {
	document.body.className = 'view-map';
	map.update( checkins ); // To set the full bounds of the map.
	renderPoints( form, { id } );
} else if ( query.toString().length ) {
	map.update( checkins ); // To set the full bounds of the map.
	form.hydrate( query );
} else {
	renderPoints( form ); // We're rendering all points, so we get the full bounds for free.
}
