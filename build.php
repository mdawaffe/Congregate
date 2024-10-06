<?php

namespace MDAWaffe\Swarm;

function format_date( $timestamp, $timezone ) {
	$date = new \DateTime( "@{$timestamp}", $timezone );
	$date->setTimezone( $timezone );
	return $date->format( \DateTime::RFC3339 );
}

$states = require __DIR__ . '/states.php';
$countries = require __DIR__ . '/countries.php';

function format_state( ?string $state, ?string $country ): ?array {
	global $states;

	if ( null === $state ) {
		return null;
	}

	$country_states = $country ? $states[$country] ?? [] : [];

	if ( isset( $country_states[$state] ) ) {
		// Get the ID...
		$state = $country_states[$state];
	}

	// ...so we can get the canonical name.
	// (array_search() returns the first match.)
	$state_name = array_search( $state, $country_states, true );

	return [
		'id' => $state,
		'name' => $state_name ?: null,
	];
}

function format_formatted_address( array $venue, array $checkin ): array {
	$formatted_address = $venue['location']['formattedAddress'] ?? $checkin['venue']['location']['formattedAddress'] ?? [];

	$cross_street = $venue['location']['crossStreet'] ?? $checkin['venue']['location']['crossStreet'] ?? null;

	if ( $cross_street ) {
		foreach ( $formatted_address as &$line ) {
			$line = str_replace( " ({$cross_street})", '', $line );
		}
	}

	return $formatted_address;
}

function format_sticker( ?array $sticker ): ?array {
	if ( ! $sticker ) {
		return null;
	}

	$emojis = [
		'007' => "\u{1F378}",
		'16 Candles' => "\u{1F370}",
		'1UP' => "\u{1F47E}",
		'7-10 Split' => "\u{1F3B3}",
		'Aaron Burrito' => "\u{1F32F}",
		"Ain't No Thang" => "\u{1F336}", // hm
		'Avocutie' => "\u{1F951}",
		'Back to the Future' => "\u{1F698}", // hm
		'Baggs' => "\u{1F6D2}",
		'Baked' => "\u{1F35E}",
		'Banksy' => "\u{1F3A8}",
		'Bargain Bin' => "\u{1F9E5}",
		'Beach Bum' => "\u{1F3C4}",
		'Berry Nice' => "\u{1F353}",
		'Bessie' => "\u{1F984}",
		'Besties' => "\u{1F46F}",
		'Big Poppy' => "\u{1F37F}",
		'Blast Off!' => "\u{1F680}", // dupe!
		'Bludolph' => "\u{1F98C}",
		'Bogey' => "\u{1F3CC}\u{FE0F}",
		'Bookworm' => "\u{1F4D6}",
		'Bowtie, No Tie' => "\u{1F380}",
		'Braaains' => "\u{1F9DF}",
		'Bronzed' => "\u{1F949}",
		'Bubbles & Slosh' => "\u{1F942}",
		'Buttons' => "\u{1F579}",
		'Cabbie' => "\u{1F695}",
		'Century Club' => "\u{1F4AF}",
		'Charlie' => "\u{1F36B}",
		'Chippy' => "\u{1F36A}",
		'Commuter' => "\u{1F3A7}",
		'Couch Surfer' => "\u{1F6CB}",
		'Crafty' => "\u{1F9F6}",
		"Crushin' It" => "\u{1F37B}",
		'Curtain Call' => "\u{1F3AD}",
		'Dark & Swarmy' => "\u{1F943}",
		'Deuce' => "\u{1F4A9}",
		'Do Not Disturb' => "\u{1F634}",
		"Dog’s Best Friend" => "\u{1F436}",
		'Dom' => "\u{1F37E}",
		'Drained' => "\u{1F50B}",
		'Droid' => "\u{1F916}",
		'Dumps' => "\u{1F95F}",
		'Earl of Sandwich' => "\u{1F96A}",
		'Endeavour' => "\u{1F680}", // dupe!
		'Explorer' => "\u{1F9ED}",
		'Family Ties' => "\u{1F5BC}", // dupe!
		'Famous Ray' => "\u{1F355}",
		'Fanatic' => "\u{1F4E3}",
		'Fiery' => "\u{1F525}",
		'Fixie' => "\u{1F6B2}",
		'Flap Jack' => "\u{1F95E}",
		'Foam-o' => "\u{2615}\u{FE0F}", // dupe!
		'Foodie' => "\u{1F9D1}\u{200D}\u{1F373}",
		'Foursquare Day' => "\u{1F36C}",
		'Fried Check-in' => "\u{1F357}",
		'General Tso' => "\u{1F961}",
		'Globetrotter' => "\u{1F6C2}",
		'Goldie' => "\u{1F947}",
		'Gooooooal' => "\u{26BD}\u{FE0F}",
		'Gravy' => "\u{1F983}",
		'Groupie' => "\u{1F918}",
		'Grumpy Cat®' => "\u{1F63E}",
		'Gym Rat' => "\u{1F3CB}\u{FE0F}", // dupe!
		'Happy Camper' => "\u{1F3D5}",
		'Herbivore' => "\u{1F995}",
		'Homie' => "\u{1FA72}",
		'Hops' => "\u{1F37A}", // dupe!
		'Hot Tamale' => "\u{1F32E}",
		'House Party' => "\u{1F3D3}",
		"I'm on a Boat" => "\u{26F5}\u{FE0F}",
		'iScream' => "\u{1F366}",
		'Jelly Rowland' => "\u{1F369}",
		'Jetsetter' => "\u{2708}\u{FE0F}",
		'Joey Beans' => "\u{2615}\u{FE0F}",
		'Jon Ham' => "\u{1F356}",
		'Juice Springsteen' => "\u{1F9C3}",
		'Kimchi' => "\u{1F962}",
		'Kupo' => "\u{1F431}",
		'Lappy Toppy' => "\u{1F4BB}",
		'Lay-Z' => "\u{1FA91}",
		'Leap Day William' => "\u{1F438}",
		'Life Aquatic' => "\u{1F41F}",
		'Lisa' => "\u{1F5BC}", // dupe!
		'Local' => "\u{2318}", // hm
		'Mall Rat' => "\u{1F6CD}", // dupe!
		'Manny Quin' => "\u{1F97B}", // hm
		'Maxed Out' => "\u{1F4B3}",
		'Mayor Slayer' => "\u{1F451}", // dupe!
		'Mic Drop' => "\u{1F3A4}",
		'Miyamoto' => "\u{1F344}",
		'Monkey Business' => "\u{1F648}",
		'Monumental' => "\u{1F5FF}",
		'Mr. Jitters' => "\u{2615}\u{FE0F}", // dupe!
		'Mr. Noodles' => "\u{1F35C}",
		'Naan Sense' => "\u{1FAD3}",
		'Napster' => "\u{1F4A4}",
		'Nerd' => "\u{1F453}",
		'Nessie' => "\u{1F995}", // dupe!
		'Newbie' => "\u{1F973}",
		'Old Glory' => "\u{1F967}",
		'Olive' => "\u{1FAD2}",
		'Opa' => "\u{1F3DB}", // hm
		'Oscar' => "\u{1F32D}",
		'Overshare' => "\u{1F4AC}",
		'Parker' => "\u{1F3DE}",
		'Patty' => "\u{1F354}",
		'Pine Fresh' => "\u{1F4A6}", // hm
		'Porky' => "\u{1F416}",
		'Prost!' => "\u{1F456}", // hm
		'Rack Overflow' => "\u{1F4B5}",
		'Red Nose Day' => "\u{1F921}", // hm
		'Retail Therapy' => "\u{1F6CD}", // dupe!
		'Return to Sender' => "\u{1F4EE}", // hm
		'Rip Van Benchy' => "\u{1F3CB}\u{FE0F}", // dupe!
		"Rollin' Deep" => "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}\u{200D}\u{1F466}", // hm
		'Romaine Calm' => "\u{1F955}",
		'Rosey' => "\u{1F339}",
		'Rouge' => "\u{1F484}",
		'Schmear' => "\u{1F96F}",
		'Shades' => "\u{1F576}",
		'Shutterbug' => "\u{1F4F7}",
		'Side Effects' => "\u{1F48A}", // hm
		'Silverado' => "\u{1F948}",
		'Skewered' => "\u{1F362}",
		'Sláinte' => "\u{1F37A}", // dupe!
		'Slugger' => "\u{26BE}\u{FE0F}",
		'Slushy' => "\u{26C4}\u{FE0F}",
		'Small Fry' => "\u{1F35F}",
		'Sneaks' => "\u{1F45F}",
		'Snowy' => "\u{1F328}",
		'Sole Mate' => "\u{1F460}",
		'Spaghetti Monster' => "\u{1F35D}",
		'Spahhhhh' => "\u{2668} \u{FE0F}", // hm
		'Sparky' => "\u{1F9E8}",
		'Spike' => "\u{1F335}",
		'Spin Cycle' => "\u{1F9FA}", // hm
		'Splashy' => "\u{1F3A1}", // hm
		'Stacks' => "\u{1F4DA}", // hm
		'Sticky Situation' => "\u{1F528}", // hm
		'Stormy' => "\u{26C8}",
		'Streaky' => "\u{1F3C3}",
		'Suds McGee' => "\u{1F37A}", // dupe!
		'Sue' => "\u{1F480}", // hm
		'Sunny' => "\u{1F31E}",
		'Sunny Side' => "\u{1F373}", // hm
		'Super Mayor' => "\u{1F451}", // dupe!
		'Superuser' => "\u{1F9B8}",
		'Swarmgate 2018' => "\u{1F5F3}", // hm
		'Swimmies' => "\u{1F3CA}", // hm
		'T-Bone' => "\u{1F404}",
		'T. P. Rolls' => "\u{1F9FB}",
		'Tasty' => "\u{1F9C2}",
		'Telly' => "\u{1F4FA}",
		'Ten-ager' => "\u{1F51F}", // hm
		'The Great Outdoors' => "\u{1F333}",
		'The Tourist' => "\u{1F933}",
		'Threads' => "\u{1F457}",
		'Ticonderoga' => "\u{270F}\u{FE0F}",
		'Tongue Thai-ed' => "\u{1F336}",
		'Toro' => "\u{1F363}",
		'Trailblazer' => "\u{1F97E}",
		'Victory Lap' => "\u{1F3C1}",
		'Vin Diesel' => "\u{26FD}\u{FE0F}",
		'Vroom Vroom' => "\u{1F697}",
		'Wheeeeee' => "\u{1F3A0}",
		'Wheels' => "\u{1F69A}",
		'Wino' => "\u{1F377}",
	];

	return [
		'id' => $sticker['id'],
		'name' => $sticker['name'],
		'icon' => $sticker['image']['prefix'] . '60' . $sticker['image']['name'],
		'emoji' => $emojis[$sticker['name']] ?? "\u{FFFD}",
	];
}

function format_unlocked_sticker( array $sticker ): array {
	$unlocked_sticker = format_sticker( $sticker );
	$unlocked_sticker['text'] = $sticker['unlockText'];

	return $unlocked_sticker;
}

function format_categories( $categories ) {
	return array_map(
		function( $category ) {
			return [
				'name' => $category['name'],
				'icon' => $category['icon']['prefix'] . '64' . $category['icon']['suffix'],
			];
		},
		$categories
	);
}

function format_photos( $photos ) {
	return array_map(
		function( $photo ) {
			return "./photos/{$photo['createdAt']}-{$photo['id']}.jpg";
		},
		$photos
	);
}

function format_hierarchy( $venue ): ?array {
	if ( ! ( $venue['hierarchy'] ?? null ) ) {
		return null;
	}

	return array_column( $venue['hierarchy'], 'name' );
}

function overlap_cmp( $a, $b ) {
	return $a['timestamp'] - $b['timestamp'];
}

function build( $source_files = null ) {
	global $countries;

	$file = sprintf( '%s/client/checkins/checkins.geo.json', __DIR__ );

	$working_file = "{$file}.work";

	$f = fopen( $working_file, 'x' );
	if ( ! $f ) {
		echo "ERROR: Could not open working file\n";
		return 1;
	}

	$first = true;
	if ( $source_files ) {
		// Prepending
		$checkin_basenames = array_map( basename(...), $source_files );
	} else {
		// Replacing

		$short_checkin_files = glob( sprintf( '%s/store/checkins/%s.json', __DIR__, '*' ) );
		$pushed_checkin_files = glob( sprintf( '%s/store/push/checkins/%s.json', __DIR__, '*' ) );

		$short_checkin_basenames = array_map( basename(...), $short_checkin_files );
		$pushed_checkin_basenames = array_map( basename(...), $pushed_checkin_files );

		$pushed_checkin_basenames = array_diff( $pushed_checkin_basenames, $short_checkin_basenames );
		if ( $pushed_checkin_basenames ) {
			$checkin_basenames = array_merge( $pushed_checkin_basenames, $short_checkin_basenames );
			rsort( $checkin_basenames, \SORT_NUMERIC );
		} else {
			$checkin_basenames = array_reverse( $short_checkin_basenames );
		}

		unset(
			$short_checkin_files,
			$pushed_checkin_files,
			$short_checkin_basenames,
			$pushed_checkin_basenames
		);
	}

	$overrides = ( @include(  __DIR__ . '/overrides.php' ) ) ?: [];

	$new_mayor_messages = [
		'New Mayor! That crown looks better on you!' => true,
		"There's a new Mayor in town!" => true,
		'You just became Mayor!' => true,
	//	'You just stole the mayorship!' => true, // caught by another test
	];

	fwrite( $f, "[\n" );

	foreach ( $checkin_basenames as $checkin_basename ) {
		$checkin_file = sprintf( '%s/store/full/checkins/%s', __DIR__, $checkin_basename );
		if ( ! file_exists( $checkin_file ) ) {
			$checkin_file = sprintf( '%s/store/checkins/%s', __DIR__, $checkin_basename );
			if ( ! file_exists( $checkin_file ) ) {
				$checkin_file = sprintf( '%s/store/push/checkins/%s', __DIR__, $checkin_basename );
			}
		}
		$checkin = json_decode( file_get_contents( $checkin_file ), true );

		$venue_file = sprintf( '%s/store/full/venues/%s.json', __DIR__, $checkin['venue']['id'] );
		if ( file_exists( $venue_file ) ) {
			$venue = json_decode( file_get_contents( $venue_file ), true );
		} else {
			echo "MISSING VENUE: $venue_file\n";
			$venue = [];
		}

		$timezone = new \DateTimeZone( sprintf( '%+05d', $checkin['timeZoneOffset'] / 60 * 100 ) );

		$categories = $checkin['venue']['categories'];
		$category_ids = array_column( $categories, 'id' );
		foreach ( $venue['categories'] ?? [] as $category ) {
			if ( ! in_array( $category['id'], $category_ids, true ) ) {
				$categories[] = $category;
			}
		}
		usort( $categories, function( $a, $b ) use ( $checkin ) {
			return ( $a['primary'] ?? null ) ? -1 : strcasecmp( $a['name'], $b['name'] );
		} );

		$sticker = format_sticker( $checkin['sticker'] ?? null );

		$unlocked_stickers = ( $checkin['unlockedStickers'] ?? null )
			? array_map( format_unlocked_sticker(...), $checkin['unlockedStickers'] )
			: null;

		$categories = format_categories( $categories );

		$became_mayor = false;
		foreach ( $checkin['score']['scores'] ?? [] as $score ) {
			if (
				isset( $new_mayor_messages[ $score['message'] ] )
			||
				// You just stole the mayorship!
				// You just stole the mayorship from X!
				0 === strpos( $score['message'], 'You just stole the mayorship' )
			) {
				$became_mayor = true;
				break;
			}
		}

		$photos = format_photos( $checkin['photos']['items'] ?? [] );

		$comments = [];
		foreach ( $checkin['comments']['items'] ?? [] as $item ) {
			$name = trim( join( ' ', [ $item['user']['firstName'] ?? '', $item['user']['lastName'] ?? '' ] ) );
			$comments[] = [
				'id' => $item['id'],
				'author' => [
					'name' => $name,
					'photo' => $item['user']['photo']['prefix'] . '100x100' . $item['user']['photo']['suffix'],
				],
				'timestamp' => $item['createdAt'],
				'date' => format_date( $item['createdAt'], $timezone ),
				'text' => $item['text'],
			];
		}

		$overlaps = [];
		foreach ( $checkin['overlaps']['items'] ?? [] as $item ) {
			$name = trim( join( ' ', [ $item['user']['firstName'] ?? '', $item['user']['lastName'] ?? '' ] ) );
			$overlaps[] = [
				'id' => $item['id'],
				'author' => [
					'name' => $name,
					'photo' => $item['user']['photo']['prefix'] . '100x100' . $item['user']['photo']['suffix'],
				],
				'timestamp' => $item['createdAt'],
				'date' => format_date( $item['createdAt'], $timezone ),
				'text' => $item['shout'] ?? null,
				'photos' => format_photos( $item['photos']['items'] ?? [] ),
			];
		}
		if ( $overlaps ) {
			usort( $overlaps, overlap_cmp(...) );
		}

		$event = ( $checkin['event'] ?? false )
			? [
				'id' => $checkin['event']['id'],
				'name' => $checkin['event']['name'],
				'categories' => format_categories( $checkin['event']['categories'] ),
			]
			: null;

		$posts = [];
		foreach ( $checkin['posts']['items'] ?? [] as $item ) {
			$posts[] = [
				'id' => $item['id'],
				'timestamp' => $item['createdAt'],
				'date' => format_date( $item['createdAt'], $timezone ),
				'text' => $item['text'] ?? null,
				'url' => $item['url'] ?? null,
				'source' => [
					'name' => $item['source']['name'],
					'icon' => $item['source']['icon'],
					'url' => $item['source']['url'],
				],
			];
		}

		$country = $venue['location']['country'] ?? $checkin['venue']['location']['country'] ?? null;
		$country = $countries[$country] ?? $country;
		$state = format_state( $venue['location']['state'] ?? $checkin['venue']['location']['state'] ?? null, $country );

		$total_score = $checkin['score']['total'] ?? 0;
		$missed = 1 === $total_score && 'https://ss1.4sqi.net/img/points/coin_icon_clock.png' === ( $checkin['score']['scores'][0]['icon'] ?? '' );

		$properties = [
			'id' => $checkin['id'],
			'name' => $checkin['venue']['name'] ?? $venue['name'],
			'parent' => $venue['parent']['name'] ?? null,
			'hierarchy' => format_hierarchy( $venue ),
			'missed' => $missed,
			'private' => $checkin['private'] ?? false,
			'venue_id' => $checkin['venue']['id'],
			'timestamp' => $checkin['createdAt'],
			'date' => format_date( $checkin['createdAt'], $timezone ),
			'text' => $checkin['shout'] ?? null,
			'sticker' => $sticker,
			'unlocked_stickers' => $unlocked_stickers,
			'categories' => $categories,
			'location' => [
				'city' => $venue['location']['city'] ?? $checkin['venue']['location']['city'] ?? null,
				'state' => $state,
				'postal_code' => $venue['location']['postalCode'] ?? $checkin['venue']['location']['postalCode'] ?? null,
				'country' => $country,
				'formatted' => format_formatted_address( $venue, $checkin ),
			],
			'became_mayor' => $became_mayor,
			'photos' => $photos,
			'posts' => $posts,
			'comments' => $comments,
			'likes' => [
				'count' => $checkin['likes']['count'] ?? 0,
				'summary' => $checkin['likes']['summary'] ?? null,
			],
			'event' => $event,
			'overlaps' => [
				'count' => $checkin['overlaps']['count'] ?? 0,
				'summary' => $checkin['overlaps']['summary'] ?? null,
				'items' => $overlaps,
			],
			'stats' => [
				'users' => $venue['stats']['usersCount'] ?? $checkin['venue']['stats']['usersCount'] ?? 0,
				'checkins' => $checkin['venue']['stats']['checkinsCount'] ?? $checkin['venue']['stats']['checkinsCount'] ?? 0,
			],
			'score' => $checkin['score'] ?? [],
		];

		if ( isset( $overrides[$checkin['id']] ) ) {
			printf( "OVERRIDING: %s - %s:%s\n", $checkin['id'], $checkin['venue']['id'], $checkin['venue']['name'] ?? $venue['name'] );
			$old = $properties;
			$properties = array_replace_recursive( $properties, $overrides[$checkin['id']] );
			foreach ( $overrides[$checkin['id']] as $key => $value ) {
				if ( 'location' === $key ) {
					foreach ( $overrides[$checkin['id']]['location'] as $key => $value ) {
						if ( $old['location'][$key] === $value ) {
							echo "	NO LONGER NEEDED: location.$key\n";
						}
					}
				} else {
					if ( $old[$key] === $value ) {
						echo "	NO LONGER NEEDED: $key\n";
					}
				}
			}
		}

		if ( $first ) {
			$first = false;
		} else {
			fwrite( $f, ",\n" );
		}

		fwrite(
			$f,
			json_encode(
				[
					'type' => 'Feature',
					'properties' => $properties,
					'geometry' => [
						'type' => 'Point',
						'coordinates' => [
							$checkin['venue']['location']['lng'] ?? $venue['location']['lng'],
							$checkin['venue']['location']['lat'] ?? $venue['location']['lat'],
						],
					],
				],
				\JSON_PRETTY_PRINT
			)
		);
	}

	if ( $source_files ) {
		// Prepending
		$ff = fopen( $file, 'r+' );
		fseek( $ff, 1, \SEEK_SET );

		fwrite( $f, ",\n" );
		stream_copy_to_stream( $ff, $f );

		fclose( $f );
		fclose( $ff );
	} else {
		// Replacing
		fwrite( $f, "\n]" );

		fclose( $f );
	}

	if ( ! rename( $working_file, $file ) ) {
		echo "ERROR: Could not rename working file. Deleting.\n";
		unlink( $working_file ); // So the next run can try again.
		return 1;
	}

	return 0;
}

// __main__
if ( realpath( __FILE__ ) === realpath( $_SERVER['DOCUMENT_ROOT'] . $_SERVER['SCRIPT_NAME'] ) ) {
	exit( build() );
}
