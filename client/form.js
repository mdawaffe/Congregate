import { formatCountry, countryFlag } from './formatting.js';

let debouncing = false;

const dateEl = document.createElement( 'input' );
dateEl.type = 'date';
/**
 * If the date is greater than 28 for now. Deal with the edge cases later.
 */
function addNMonths( value, n ) {
	dateEl.value = value;
	if ( ! dateEl.valueAsDate ) {
		return NaN;
	}

	if ( dateEl.valueAsDate.getUTCDate() > 28 ) {
		return NaN
	}

	const currentMonth = dateEl.valueAsDate.getUTCMonth();
	let targetMonth = ( ( ( ( currentMonth + n ) % 12 ) + 12 ) % 12 );

	dateEl.valueAsNumber = dateEl.valueAsDate.setUTCMonth( currentMonth + n );
	if ( dateEl.valueAsDate.getUTCMonth() === targetMonth ) {
		return dateEl.value;
	}

	// We overflowed the month. Set to the last day of the target month.
	// This can't actually happen since we're bailing above.
	dateEl.value = value;
	dateEl.valueAsNumber = dateEl.valueAsDate.setUTCMonth( currentMonth + n + 1, 0 );

	return dateEl.value;
}


export class Form extends EventTarget {
	#form;
	#countries;
	#firstProcess;

	getCountryMap() {
		return this.#countries;
	}

	populateDataLists( checkins ) {
		const countries = this.#countries;
		const categories = new Set;
		const stickerMap = new Map;
		for ( const checkin of checkins ) {
			checkin.properties.categories.forEach( category => categories.add( category.name ) );
			const countryID = checkin.properties.location?.country?.id ?? null;
			countries.set( formatCountry( checkin.properties.location?.country ), countryID );
			if ( checkin.properties.sticker ) {
				stickerMap.set( checkin.properties.sticker.name, checkin.properties.sticker.emoji );
			}
		}

		const categoryList = this.#form.querySelector( '#categories' );
		Array.from( categories ).sort().forEach( value => {
			const option = document.createElement( 'option' );
			option.value = value;
			categoryList.appendChild( option );
		} );

		const countryList = this.#form.querySelector( '#countries' );
		Array.from( countries.entries() ).sort( ( a, b ) => ( a[0] || '' ).localeCompare( b[0] || '' ) ).forEach( ( [ name, id ] ) => {
			const option = document.createElement( 'option' );
			option.value = `${ countryFlag( countries, name ) } ${name}`;
			countryList.appendChild( option );
		} );

		const stickerList = this.#form.querySelector( '#stickers' );
		for ( const [ name, emoji ] of Array.from( stickerMap.entries() ).sort( ( a, b ) => a[0].localeCompare( b[0] ) ) ) {
			const option = document.createElement( 'option' );
			option.value = `${emoji} ${name}`;
			stickerList.appendChild( option );
		}
	}

	#updateDateList() {
		const form = this.#form;
		const elements = form.elements;

		if ( ! elements.start.valueAsNumber && ! elements.end.valueAsNumber ) {
			return;
		}

		elements.start.parentNode.className = '';
		elements.end.parentNode.className = '';

		const dateElement = document.createElement( 'input' );
		dateElement.type = 'date';

		if ( elements.start.valueAsNumber && elements.end.valueAsNumber ) {
			let prevStart;
			dateElement.value = elements.start.value;
			dateElement.valueAsNumber = dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() - 1 );
			let prevEnd = dateElement.value;

			dateElement.value = elements.end.value;
			dateElement.valueAsNumber = dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() + 1 );
			let nextStart = dateElement.value;
			let nextEnd;

			if ( elements.end.valueAsNumber === elements.start.valueAsNumber ) {
				// Days
				prevStart = prevEnd;
				nextEnd = nextStart;
			} else if ( 1000 * 60 * 60 * 24 * 6 === elements.end.valueAsNumber - elements.start.valueAsNumber ) {
				// Weeks
				dateElement.value = elements.start.value;
				dateElement.valueAsNumber = dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() - 7 );
				prevStart = dateElement.value;

				dateElement.value = elements.end.value;
				dateElement.valueAsNumber = dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() + 7 );
				nextEnd = dateElement.value;
			} else if ( dateElement.valueAsNumber ) {
				dateElement.value = addNMonths( elements.start.value, 1 );
				dateElement.valueAsNumber = dateElement.valueAsNumber && dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() - 1 );

				if ( dateElement.valueAsNumber && elements.end.value === dateElement.value ) {
					// Months
					dateElement.value = addNMonths( elements.start.value, -1 );
					prevStart = dateElement.value;

					dateElement.value = addNMonths( elements.start.value, 2 );
					dateElement.valueAsNumber = dateElement.valueAsNumber && dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() - 1 );
					nextEnd = dateElement.value;
				} else {
					dateElement.value = addNMonths( elements.start.value, 12 );
					dateElement.valueAsNumber = dateElement.valueAsNumber && dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() - 1 );

					if ( dateElement.valueAsNumber && elements.end.value === dateElement.value ) {
						// Years
						dateElement.value = addNMonths( elements.start.value, -12 );
						prevStart = dateElement.value;

						dateElement.value = addNMonths( elements.start.value, 24 );
						dateElement.valueAsNumber = dateElement.valueAsNumber && dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() - 1 );
						nextEnd = dateElement.value;
					}
				}
			}

			if ( nextEnd ) {
				elements.start.parentNode.className = 'increments';
				elements.end.parentNode.className = 'increments';
				const currentURL = new URL( document.location.href );
				currentURL.searchParams.delete( 'page' );

				currentURL.searchParams.set( 'start', prevStart );
				currentURL.searchParams.set( 'end', prevEnd );
				elements.start.parentNode.querySelector( 'a' ).href = currentURL.toString();

				currentURL.searchParams.set( 'start', nextStart );
				currentURL.searchParams.set( 'end', nextEnd );
				elements.end.parentNode.querySelector( 'a' ).href = currentURL.toString();
			} else {
				elements.start.parentNode.className = '';
				elements.end.parentNode.className = '';
			}
		}

		const dateList = form.querySelector( '#dates' );

		let suggested = [];
		if ( elements.start.value && ! elements.end.value ) {
			dateElement.valueAsNumber = elements.start.valueAsNumber + 1000 * 60 * 60 * 24 * 6;
			const oneWeek = dateElement.value;

			dateElement.value = elements.start.value;
			dateElement.valueAsNumber = dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() - 1 );
			dateElement.valueAsNumber = dateElement.valueAsDate.setUTCMonth( dateElement.valueAsDate.getUTCMonth() + 1 );
			const oneMonth = dateElement.value;

			dateElement.value = elements.start.value;
			dateElement.valueAsNumber = dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() - 1 );
			dateElement.valueAsNumber = dateElement.valueAsDate.setUTCFullYear( dateElement.valueAsDate.getUTCFullYear() + 1 );
			const oneYear = dateElement.value;

			suggested = [
				[ elements.start.value, 'One day' ],
				[ oneWeek, 'One week' ],
				[ oneMonth, 'One month' ],
				[ oneYear, 'One year' ],
			];
			elements.start.removeAttribute( 'list' );
			elements.end.setAttribute( 'list', 'dates' );
		} else if ( ! elements.start.value && elements.end.value ) {
			dateElement.valueAsNumber = elements.end.valueAsNumber - 1000 * 60 * 60 * 24 * 6;
			const oneWeek = dateElement.value;

			dateElement.value = elements.end.value;
			dateElement.valueAsNumber = dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() + 1 );
			dateElement.valueAsNumber = dateElement.valueAsDate.setUTCMonth( dateElement.valueAsDate.getUTCMonth() - 1 );
			const oneMonth = dateElement.value;

			dateElement.value = elements.end.value;
			dateElement.valueAsNumber = dateElement.valueAsDate.setUTCDate( dateElement.valueAsDate.getUTCDate() + 1 );
			dateElement.valueAsNumber = dateElement.valueAsDate.setUTCFullYear( dateElement.valueAsDate.getUTCFullYear() - 1 );
			const oneYear = dateElement.value;

			suggested = [
				[ elements.end.value, 'One day' ],
				[ oneWeek, 'One week' ],
				[ oneMonth, 'One month' ],
				[ oneYear, 'One year' ],
			];
			elements.end.removeAttribute( 'list' );
			elements.start.setAttribute( 'list', 'dates' );
		} else if ( ! elements.start.value && ! elements.end.value ) {
			dateList.replaceChildren();
			return;
		}

		if ( ! suggested.length ) {
			// Don't change the datalist. This way, you can pick "One day" then change your mind and pick "One week".
			return;
		}

		dateList.replaceChildren();

		for ( const [ value, label ] of suggested ) {
			const option = document.createElement( 'option' );
			option.value = value;
			option.textContent = label;
			dateList.appendChild( option );
		}
	}

	#getValuesArray() {
		return Array.from( new FormData( this.#form ).entries() ).filter( ( [ key, value ] ) => value.length );
	}

	getState() {
		return [...this.#form.elements].filter( element => element.name ).reduce( ( state, element ) => {
			let value;
			switch ( element.type ) {
				case 'checkbox' :
					value = element.checked;
					break;
				case 'date' :
					state = { ...state, [`${ element.name }AsNumber`]: element.valueAsNumber }
					// no break
				default :
					value = element.value;
			}

			return { ...state, [element.name]: value };
		}, {} );
	}

	#serialize() {
		const params = new URLSearchParams( this.#getValuesArray() );
		return params.toString();
	}

	disable( fields ) {
		for ( const [ field, value ] of Object.entries( fields ) ) {
			this.#form.elements[field].disabled = value;
		}
	}

	update( state, args ) {
		let didUpdate = false;
		for ( const [ key, value ] of Object.entries( state ) ) {
			if ( !this.#form.elements?.[key] ) {
				throw new Error( `Unknown form element: ${ key }` );
			}

			if ( 'boolean' === typeof value ) {
				if ( this.#form.elements[key].checked === value ) {
					continue;
				}
				this.#form.elements[key].checked = value;
			} else {
				if ( this.#form.elements[key].value === value ) {
					continue;
				}
				this.#form.elements[key].value = value;
			}
			didUpdate = true;
		}

		if ( didUpdate ) {
			this.#onFormUserInteraction( args );
		}
	}

	hydrate( query ) {
		const elements = this.#form.elements;

		this.#form.reset(); // also clears page and bbox via the reset event handler.

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
			// We're hydrating this field, so we want to include it in the form data.
			elements[key].disabled = false;
		}

		// this.#processForm is called by the reset event handler.
	}

	#processForm( args ) {
		const queryString = this.#serialize();
		const currentQueryString = document.location.search.slice( 1 );
		if ( currentQueryString !== queryString ) {
			history.pushState( {}, '', '' === queryString ? './' : '?' + queryString );
		}

		if ( currentQueryString !== queryString || ! this.#firstProcess ) {
			this.#firstProcess = true;

			this.#updateDateList();

			this.dispatchEvent( new CustomEvent( 'change', { detail: { state: this.getState(), args } } ) );
		}
	}

	#onFormUserInteraction( args ) {
		this.#form.elements.page.value = '';

		// We sometimes get a change event (click a checkbox, e.g.)
		// We sometimes get a search event (click the clear field button in a search input, e.g.)
		// We sometimes get both events (type something into a search input and hit enter, e.g.)
		// We don't care which event(s) we get, but we only need to process one.
		if ( debouncing ) {
			return;
		}

		debouncing = true;
		window.setTimeout( () => debouncing = false );

		this.#processForm( args )
	}

	#reset() {
		this.#form.elements.page.value = '';
		this.#form.elements.bbox.value = '';
		this.#form.elements.source.value = '';

		this.#form.elements.start.parentNode.className = '';
		this.#form.elements.end.parentNode.className = '';

		// The form is still filled.
		window.setTimeout( () => {
			// Now the form is empty.
			this.#processForm();
		} );
	}

	constructor( form ) {
		super();

		this.#form = form;
		this.#countries = new Map;

		form.addEventListener( 'submit', event => {
			event.preventDefault();
		} );
		form.addEventListener( 'reset', () => this.#reset() );
		form.addEventListener( 'change', () => this.#onFormUserInteraction() );
		form.addEventListener( 'search', () => this.#onFormUserInteraction() );
		form.addEventListener( 'click', ( event ) => {
			if ( ! event.target.matches( 'li.increments a' ) ) {
				return;
			}

			event.preventDefault();

			const targetURL = new URL( event.target.href );
			this.hydrate( targetURL.searchParams );
		} );

		const country = form.querySelector( '#country' );
		const fixCountryAndClearSubUnits = ( event ) => {
			event.target.value = event.target.value.replace( /\p{Regional_Indicator}/ug, '' ).trim();

			if ( ! event.target.value ) {
				form.elements.state.value = '';
				form.elements.city.value = '';
			}
		}

		country.addEventListener( 'change', event => fixCountryAndClearSubUnits( event ) );
		country.addEventListener( 'search', event => fixCountryAndClearSubUnits( event ) );

		window.addEventListener( 'popstate', event => {
			this.#firstProcess = false;
			this.hydrate( new URLSearchParams( document.location.search.slice( 1 ) ) );
		} );

		this.#updateDateList();
	}
}
