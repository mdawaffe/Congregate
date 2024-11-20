export function countryFlag( countries, countryName ) {
	const id = countries.get( countryName ) ?? '';
	return id.split( '' ).map( c => String.fromCodePoint( ( c.codePointAt() - 65 ) + 0x1F1E6 ) ).join( '' );
}

export function formatCountry( country ) {
	return (
		// Current build format.
		country?.name
		// Previous build format.
		|| ( 'string' === typeof country && country )
		// Fallback.
		|| '-NONE-'
	);
}

export function formatDate( dateString ) {
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
