import { formatCountry, countryFlag } from './formatting.js';

let debouncing = false;

export class Form extends EventTarget {
	#form;
	#countries;

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

		const dateList = form.querySelector( '#dates' );

		const dateElement = document.createElement( 'input' );
		dateElement.type = 'date';

		let suggested = [];
		if ( elements.start.value && ! elements.end.value ) {
			dateElement.valueAsNumber = elements.start.valueAsNumber + 1000 * 60 * 60 * 24 * 6;
			const oneWeek = dateElement.value;

			dateElement.value = elements.start.value;
			dateElement.valueAsNumber = dateElement.valueAsDate.setDate( dateElement.valueAsDate.getDate() - 1 );
			dateElement.valueAsNumber = dateElement.valueAsDate.setMonth( dateElement.valueAsDate.getMonth() + 1 );
			const oneMonth = dateElement.value;

			dateElement.value = elements.start.value;
			dateElement.valueAsNumber = dateElement.valueAsDate.setDate( dateElement.valueAsDate.getDate() - 1 );
			dateElement.valueAsNumber = dateElement.valueAsDate.setFullYear( dateElement.valueAsDate.getFullYear() + 1 );
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
			dateElement.valueAsNumber = dateElement.valueAsDate.setDate( dateElement.valueAsDate.getDate() + 1 );
			dateElement.valueAsNumber = dateElement.valueAsDate.setMonth( dateElement.valueAsDate.getMonth() - 1 );
			const oneMonth = dateElement.value;

			dateElement.value = elements.end.value;
			dateElement.valueAsNumber = dateElement.valueAsDate.setDate( dateElement.valueAsDate.getDate() + 1 );
			dateElement.valueAsNumber = dateElement.valueAsDate.setFullYear( dateElement.valueAsDate.getFullYear() - 1 );
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
		return Array.from( new FormData( this.#form ).entries() ).filter( ( [ key, value ] ) => value.length )
	}

	getValues() {
		return Object.fromEntries( this.#getValuesArray() );
	}

	#serialize() {
		const params = new URLSearchParams( this.#getValuesArray() );
		return params.toString();
	}

	processForm( args ) {
		const queryString = this.#serialize();
		if ( document.location.search.slice( 1 ) !== queryString ) {
			history.pushState( {}, '', '' === queryString ? './' : '?' + queryString );
		}

		this.#updateDateList();

		this.dispatchEvent( new CustomEvent( 'change', { state: this.getValues() } ) );
	}

	onFormUserInteraction( args ) {
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

		this.processForm( args )
	}

	#reset() {
		this.#form.elements.page.value = '';
		this.#form.elements.bbox.value = '';
		this.#form.elements.source.value = '';

		// The form is still filled.
		window.setTimeout( () => {
			// Now the form is empty.
			this.processForm();
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
		form.addEventListener( 'change', () => this.onFormUserInteraction() );
		form.addEventListener( 'search', () => this.onFormUserInteraction() );

		this.#updateDateList();
	}
}
