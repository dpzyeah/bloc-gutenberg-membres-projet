<?php
/**
 * Render callback for the cerse/project-team block.
 *
 * @param array $attributes Block attributes.
 * @return string Rendered block HTML.
 */
function render_cerse_project_team_block($attributes, $content, $block) {
	$group_title = $attributes['groupTitle'] ?? '';
	$members = $attributes['members'] ?? [];
	
	// Récupérer les blockProps
	// $block_props = $block['blockProps'] ?? [];
	$wrapper_attributes = get_block_wrapper_attributes();
	
	// Debug: Vérifier les données reçues
	// error_log('Cerse Project Team - Attributes: ' . print_r($attributes, true));
	// error_log('Cerse Project Team - Block Props: ' . print_r($block_props, true));
	
	ob_start();
	?>
	<section <?php echo $wrapper_attributes; ?>>
		<?php if (!empty($group_title)) : ?>
			<h3>
				<?php echo wp_kses_post($group_title); ?>
			</h3>
		<?php endif; ?>
		
		<?php if (!empty($members)) : ?>
			<ul class="cerse-project-team__list">
				<?php foreach ($members as $member) : ?>
					<?php
					$member_id = $member['id'] ?? 0;
					$member_title = $member['title'] ?? '';
					$featured_media_id = $member['featured_media'] ?? 0;
					$member_link = $member['link'] ?? '';
					
					// Récupérer les données du membre en temps réel
					$member_post = get_post($member_id);
					if ($member_post && $member_post->post_type === 'cerse_equipe') {
						$member_title = $member_post->post_title;
						$featured_media_id = get_post_thumbnail_id($member_id);
						$member_link = get_permalink($member_id);
					}
					
					// Récupérer l'URL de l'image en temps réel
					$image_url = '';
					if ($featured_media_id > 0) {
						$image_url = wp_get_attachment_image_url($featured_media_id, 'cerse_equipe_90h');
					}
					?>
					<li class="cerse-project-team__item" data-id="<?php echo esc_attr($member_id); ?>">
						<?php if ($image_url) : ?>
							<img 
								src="<?php echo esc_url($image_url); ?>"
								alt="<?php echo esc_attr($member_title); ?>"
								class="cerse-project-team__image"
							/>
						<?php endif; ?>

						
						
						<span class="cerse-project-team__name">
							<?php if ($member_link) : ?>
								<div class="wp-block-button is-style-cerse-variant-2 has-color-swap" style="--fg:var(--wp--preset--color--orange-light);--bg:var(--wp--preset--color--contrast)">
							<a rel="noopener noreferrer" href="<?php echo esc_url($member_link); ?>" class="wp-block-button__link has-orange-light-color has-contrast-background-color has-text-color has-background has-link-color wp-element-button">
								<span><?php echo esc_html($member_title); ?></span>
							</a>
						</div>
								
							<?php else : ?>
								<?php echo esc_html($member_title); ?>
							<?php endif; ?>
						</span>
					</li>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>
	</section>
	<?php
	
	return ob_get_clean();
}
