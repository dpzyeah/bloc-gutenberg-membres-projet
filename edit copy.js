/*
    Programmation d'un bloc Gutenberg lié à un custom posttype.
    Le bloc doit permettre d'associer des membres de l'equipe à un projet en affichant l'image à la une, le permalien, et le titre du membre.
    Un champ de recherche doit permettre de sélectionner ou de chercher un membre par son nom.
    Plusieurs membres peuvent être sélectionnés.
*/
// Outils WordPress de base
import { __ } from "@wordpress/i18n"; // Traduction
import { useMemo, useState, useEffect } from "@wordpress/element"; // Hooks React
import { useSelect } from "@wordpress/data"; // Récupération de données WP
import { store as coreStore } from "@wordpress/core-data";

// Composants d'interface
import {
	PanelBody,
	FormTokenField, // Champ de recherche avec sélection multiple
	Spinner,
	Notice,
} from "@wordpress/components";

// Outils pour blocs Gutenberg
import {
	InspectorControls, // Panneau latéral de réglages
	useBlockProps,
	RichText, // Texte éditable avec formatage
} from "@wordpress/block-editor";
/**
 * Récupère tous les membres de l'équipe
 * Crée des objets clé-valeur pour un accès rapide par ID
 */
function listeDesMembres() {
	const query = useMemo(
		() => ({
			per_page: 100,
			status: "publish",
			context: "view",
			_fields: ["id", "title", "featured_media"],
			_embed: true,
			orderby: "title",
			order: "asc",
		}),
		[],
	);

	const posts = useSelect(
		(select) =>
			select(coreStore).getEntityRecords("postType", "cerse_equipe", query),
		[query],
	);

	const isResolving = useSelect(
		(select) =>
			select(coreStore).isResolving("getEntityRecords", [
				"postType",
				"cerse_equipe",
				query,
			]),
		[query],
	);

	
	// ID → Titre
	const idToTitle = useMemo(() => {
		const map = {};
		(posts || []).forEach((p) => {
			map[p.id] = p?.title?.rendered || p?.title || `#${p.id}`;
		});
		return map;
	}, [posts]);

	// ID → Image
	const idToFeaturedMedia = useMemo(() => {
		const map = {};
		(posts || []).forEach((p) => {
			map[p.id] = p?.featured_media || 0;
		});
		return map;
	}, [posts]);

	// ID → Lien
	const idToPermalink = useMemo(() => {
		const map = {};
		(posts || []).forEach((p) => {
			map[p.id] = p?.link || '';
		});
		return map;
	}, [posts]);

	// Format pour le champ de recherche : ["5:Marie Dupont", "8:Jean Martin"]
	const suggestions = useMemo(
		() => (posts || []).map((p) => `${p.id}:${idToTitle[p.id]}`),
		[posts, idToTitle],
	);

	return {
		loading: !!isResolving && !posts,
		idToTitle,
		idToFeaturedMedia,
		idToPermalink,
		suggestions,
	};
}

/**
 * Convertit les membres en format "ID:Nom" pour le champ de recherche
 */
function tokensFromMembers(members) {
	return (members || []).map((m) => `${m.id}:${m.title}`);
}

/**
 * Convertit les tokens du champ de recherche en objets membres complets
*/
function membersFromTokens(tokens, idToTitle, idToFeaturedMedia, idToPermalink) {
	return (
		(tokens || [])
			.map((t) => {
				if (typeof t === "number") {
					return { 
						id: t, 
						title: idToTitle[t] || String(t),
						featured_media: idToFeaturedMedia[t] || 0,
						link: idToPermalink[t] || ''
					};
				}
				
				const id = parseInt(String(t).split(":")[0], 10);
				if (!Number.isFinite(id)) return null;
				
				return { 
					id, 
					title: idToTitle[id] || String(t),
					featured_media: idToFeaturedMedia[id] || 0,
					link: idToPermalink[id] || ''
				};
			})
			.filter(Boolean)
			// Suppression des doublons
			.reduce((acc, cur) => {
				if (acc.find((m) => m.id === cur.id)) return acc;
				acc.push(cur);
				return acc;
			}, [])
	);
}

/**
 * Composant principal du bloc - gère l'interface d'édition Gutenberg
 */
export default function Edit({ attributes, setAttributes }) {
	const { groupTitle, members } = attributes;
	const blockProps = useBlockProps();
	const { loading, idToTitle, idToFeaturedMedia, idToPermalink, suggestions } = listeDesMembres();

	// URLs des images
	const [imageUrls, setImageUrls] = useState({});

	/**
	 * Synchronise des données des membres au chargement de WordPress 
	 * et à chaque changement de idToTitle, idToFeaturedMedia, idToPermalink
	*/
	useEffect(() => {
		if (!members?.length) return;
		
		const next = members.map((m) => ({
			id: m.id,
			title: idToTitle[m.id] || m.title || String(m.id),
			featured_media: idToFeaturedMedia[m.id] || m.featured_media || 0,
			link: idToPermalink[m.id] || m.link || '',
		}));
		
		if (JSON.stringify(next) !== JSON.stringify(members)) {
			setAttributes({ members: next });
		}
	}, [idToTitle, idToFeaturedMedia, idToPermalink]); 

	/**
	 * Récupère les URLs des images des membres via l'API WordPress
	*/
	
	useEffect(() => {
		const fetchImageUrls = async () => {
			const newImageUrls = {};
			
			for (const member of members || []) {
				if (member.featured_media && member.featured_media > 0) {
					try {
						const response = await fetch(`/wp-json/wp/v2/media/${member.featured_media}`);
						const media = await response.json();
						if (media.source_url) {
							newImageUrls[member.id] = media.source_url;
						}
					} catch (error) {
						console.error('Error fetching media for member', member.id, ':', error);
					}
				}
			}
			
			setImageUrls(newImageUrls);
		};

		if (members && members.length > 0) {
			fetchImageUrls();
		}
	}, [members]);

	const tokens = useMemo(() => tokensFromMembers(members), [members]);

	return (
		<>
			{/* Panneau latéral de configuration */}
			<InspectorControls>
				<PanelBody title={__("Paramètres", "cerse")} initialOpen>
					<FormTokenField
						label={
							loading
								? __("Membres (chargement…)", "cerse")
								: __("Membres", "cerse")
						}
						disabled={loading}
						value={tokens}
						suggestions={suggestions}
						onChange={(newTokens) =>
							setAttributes({
								members: membersFromTokens(newTokens, idToTitle, idToFeaturedMedia, idToPermalink),
							})
						}
						__experimentalShowHowTo={false} // on a déjà un placeholder
						placeholder={__("Tapez pour rechercher (id ou nom)", "cerse")}
					/>
					{loading && <Spinner />}
					{!loading && !suggestions.length && (
						<Notice status="warning" isDismissible={false}>
							{__(
								"Aucun membre 'cerse_equipe' publié n'a été trouvé.",
								"cerse",
							)}
						</Notice>
					)}
				</PanelBody>
			</InspectorControls>

			{/* Contenu principal du bloc */}
			<div {...blockProps}>
				{/* Titre éditable du groupe */}
				<RichText
					tagName="h3"
					value={groupTitle}
					onChange={(v) => setAttributes({ groupTitle: v })}
					placeholder={__("Équipe du projet", "cerse")}
					allowedFormats={["core/bold", "core/italic"]}
					className="cerse-project-team__group-title"
				/>
				
				{/* Liste des membres sélectionnés */}
				{members?.length ? (
					<ul className="cerse-project-team__list">
						{members.map((m) => {
							const imageUrl = imageUrls[m.id];
							return (
								<li key={m.id} data-id={m.id} className="cerse-project-team__item">
									{/* Affichage image ou placeholder */}
									{m.featured_media && m.featured_media > 0 && (
										imageUrl ? (
											<img 
												src={imageUrl}
												alt={m.title || `Membre ${m.id}`}
												className="cerse-project-team__image"
												style={{ width: 'auto', height: '90px', objectFit: 'cover'}}
											/>
										) : (
											<div 
												className="cerse-project-team__image-placeholder"
												style={{ 
													width: '50px', 
													height: '50px', 
													borderRadius: '50%', 
													marginRight: '10px',
													backgroundColor: '#e0e0e0',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													fontSize: '12px',
													color: '#666'
												}}
											>
												{m.featured_media}
											</div>
										)
									)}
									{/* Nom avec lien optionnel */}
									<span className="cerse-project-team__name">
										{m.link ? (
											<a href={m.link} target="_blank" rel="noopener noreferrer">
												{m.title || `#${m.id}`}
											</a>
										) : (
											m.title || `#${m.id}`
										)}
									</span>
								</li>
							);
						})}
					</ul>
				) : (
					/* Message d'aide pour sélectionner des membres */
					<p style={{ opacity: 0.7 }}>
						{__("Sélectionnez des membres dans le panneau latéral.", "cerse")}
					</p>
				)}
			</div>
		</>
	);
}
