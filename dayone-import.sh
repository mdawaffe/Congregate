#!/bin/bash

IMPORT_DIR=$( mktemp -d -t dayone )

if [ -z "$IMPORT_DIR" ] || ! [ -d "$IMPORT_DIR" ]; then
	echo "Could not create temporary direcctory."
	exit 1
fi

function cleanup {
	rm -rf "$IMPORT_DIR"
}

trap cleanup EXIT

PHOTOS_FILTER=$( cat <<EOF
	.[] |
		  .photos.items
		+ [ ( ( .overlaps.items // [] )[].photos.items // [] )[] ]
			| .[]
			| "store/full/photos/\(.createdAt)-\(.id).\(.suffix | split( "." )[-1])"
EOF
)

JSON_ONLY=0

FILES=()
for ARG in "$@"; do
	case "$ARG" in
		--json-only)
			JSON_ONLY=1
			;;
		--*)
			:
			;;
		*)
			FILES+=("$ARG")
			;;
	esac
done

PHOTO_FILES=( $( cat "${FILES[@]}" | jq -r --slurp "$PHOTOS_FILTER" | sort ) )
mkdir "$IMPORT_DIR/photos"

PHOTO_ARGS=()
if [ "${#PHOTO_FILES[@]}" -gt 0 ]; then
	while read -r PHOTO_FILE MD5 TYPE DIM SIZE; do
		ID="${PHOTO_FILE##*-}"
		ID="${ID%.*}"
		TYPE=$( echo "$TYPE" | tr 'A-Z' 'a-z' );
		ARGJSON=$(
			jq --null-input --compact-output \
				--arg id "$ID" \
				--arg md5 "$MD5" \
				--arg type "$TYPE" \
				--argjson width "${DIM%x*}" \
				--argjson height "${DIM#*x}" \
				--argjson size "${SIZE%?}" '{
					fileSize: $size,
					type: $type,
					identifier: $id,
					width: $width,
					height: $height,
					md5: $md5,
				}'
		)
		PHOTO_ARGS+=( '--argjson' "photo$ID" "$ARGJSON" )
		if [ "$JSON_ONLY" -eq 0 ]; then
			cp "$PHOTO_FILE" "$IMPORT_DIR/photos/$MD5.$TYPE"
		fi
	done < <( join -1 1 -2 2 -o0,2.1,1.2,1.3,1.7 <( identify "${PHOTO_FILES[@]}" ) <( md5sum "${PHOTO_FILES[@]}" ) )
fi

IMPORT_FILTER=$( cat <<EOF
{
	Baseball: "\u26BE\uFE0F",
	Concert: "\uD83C\uDFB6",
	Football: "\uD83C\uDFC8",
	Movie: "\uD83C\uDFAC",
	Soccer: "\u26BD\uFE0F",
	default: "\uD83C\uDF9F\uFE0F",
} as \$eventIcons |
{
	metadata: {
		version: "1.0",
	},
	entries: [ .[] | ( .score?.total? == 1 and "https://ss1.4sqi.net/img/points/coin_icon_clock.png" == .score.scores[0]?.icon? ) as \$missed | {
		creationDate: .createdAt | todateiso8601,
		tags: (
			  [ ( "swarm:venue:" + .venue.id ), ( .venue.categories[] | "swarm:venue:" + ( .name | sub( "\\\\s+"; "-"; "g" ) | ascii_downcase ) ) ]
			+ [ if .event?.id? then "swarm:event", "swarm:event:" + .event.id else empty end ]
			+ [ ( ( .event?.categories? // [] ) | .[] | "swarm:event:" + ( .name | sub( "\\\\s+"; "-"; "g" ) | ascii_downcase ) ) ]
			+ [ if .isMayor? then "mayor" else empty end, if .isMayor then "swarm:mayor" else empty end ]
			+ [ if \$missed then "swarm:missed" else empty end ]
			+ [ if .likes?.count? > 0 then "swarm:likes" else empty end ]
			+ [ if .comments?.count? > 0 then "swarm:comments" else empty end ]
			+ [ if .posts?.count? > 0 then "swarm:posts" else empty end ]
			+ [ if .overlaps?.count? > 0 then "swarm:overlaps" else empty end ]
			+ [ if .private? then "swarm:private" else empty end ]
		),
		text: ( (
			  [ "# \(if .private? then "\ud83d\udd12 " else "" end)\(if \$missed then "\u23F0 " else "" end)\(.venue.name)" ]
			+ [ if .event?.id? then ( [ ( if ( .event.categories | length > 0 ) then .event.categories else [ { shortName: "" } ] end )[] | \$eventIcons[.shortName] // \$eventIcons.default ] | join( "" ) ) + " \(.event.name)" else empty end ]
			+ ( .venue.location.crossStreet as \$cross | .venue.location.formattedAddress | map( . | split( " (\(\$cross))" ) | join( "" ) ) ) + [ "" ]
			+ [ if .shout? then .shout, "" else empty end ]
			+ [ ( .photos?.items? // [] ) | .[] | ( "![](dayone-moment://\(.id))", "" ) ]
			+ [
				if .overlaps?.count? > 0 then
					.overlaps.summary,
					(
						.overlaps.items[] |
							"* \( [ .user.firstName? // empty, .user.lastName? // empty ] | join( " " ) ) @ \( .createdAt | todateiso8601 )",
							( if .shout? then "  \(.shout)" else empty end ),
							( ( .photos?.items? // [] ) | .[] | ( "  ![](dayone-moment://\(.id))" ) )
					),
					""
				else empty end
			  ]
			+ [
				if .likes?.count? > 0 then
					( .likes.groups[] | .items[] | [ "\u2764\uFE0F", .firstName? // empty, .lastName? // empty ] | join( " " ) ),
					""
				else empty end
			  ]
			+ [
				if .comments?.count? > 0 then
					"## Comments",
					(
						.comments.items[] |
							"1. \( [ .user?.firstName? // empty, .user?.lastName? // empty ] | join( " " ) ) @ \( .createdAt | todateiso8601 )",
							"   \(.text)"
					),
					""
				else empty end
			  ]
			+ [
				if .posts?.count? > 0 then
					"## Linked Posts",
					(
						.posts.items[] |
							"1. \( .source?.name? // "" ) @ \( .createdAt | todateiso8601 )",
							"   [\(.text)](\(.url))"
					),
					""
				else empty end
			  ]
		) | join( "\n" ) ),
		location: (
			{
				region: {
					center: {
						latitude: .venue.location.lat,
						longitude: .venue.location.lng,
					},
					radius: 75,
				},
				placeName: .venue.name,
				latitude: .venue.location.lat,
				longitude: .venue.location.lng,
			}
			+ if .venue.location.country? then { country: .venue.location.country } else empty end
			+ if .venue.location.state? then { administrativeArea: .venue.location.state } else empty end
			+ if .venue.location.city? then { localityName: .venue.location.city } else empty end
		),
		photos: (
			(
				  ( .photos?.items? // [] )
				+ [ if .overlaps?.count? > 0 then ( .overlaps.items[] | ( .photos?.items? // [] )[] ) else empty end ]
			) | [
				.[] | \$ARGS.named["photo\(.id)"]
			]
		),
	} ]
}
EOF
)

OUTPUT_FILE="$IMPORT_DIR/compiled.json"
if [ "$JSON_ONLY" -eq 1 ]; then
	OUTPUT_FILE=""
fi

function output {
	(
		if [ -n "$1" ]; then exec > "$1"; fi
		cat
	)
}

cat "${FILES[@]}" | jq --slurp "${PHOTO_ARGS[@]}" "$IMPORT_FILTER" | output "$OUTPUT_FILE"

if [ "$JSON_ONLY" -eq 0 ]; then
	CURRENT_DIR="$( pwd )"
	cd "$IMPORT_DIR"
	zip -r "$CURRENT_DIR/compiled.zip" .
	cd -
fi
