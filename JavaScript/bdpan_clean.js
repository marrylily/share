// 百度网盘 iOS 首页净化脚本 (Surge http-response script)
const url = $request.url;
if (!$response.body) {
  $done({});
} else {
  try {
    let obj = JSON.parse($response.body);

    if (url.includes("/feed/cardinfos")) {
      if (obj.data) {
        obj.data.cards = [{ card_id: "0", type: "0" }];
        obj.data.count = 1;
        obj.data.cursor = "";
        obj.data.refreshnum = 0;
        obj.data.reset = true;
      }
    } else if (url.includes("/imagestory/miner/api/v2/picrecommend")) {
      if (obj.data) obj.data.list = [];
    } else if (url.includes("/aipic/online/getcardlist")) {
      if (obj.data) {
        obj.data.cards = [];
        obj.data.has_more = false;
        obj.data.extra_info = "";
      }
    } else if (url.includes("/aipic/conf/dynamicIsland") || url.includes("/recommend/searchbox/bottom") || url.includes("/buy/ad/get")) {
      obj.data = {};
    } else if (url.includes("/aipic/image/story/animationconf")) {
      obj.conf = {};
    } else if (url.includes("/api/notice/list")) {
      if (obj.data) obj.data.list = [];
    } else if (url.includes("/act/api/activityentry")) {
      obj.popup_list = [];
    } else if (url.includes("/rest/2.0/pcs/adv")) {
      obj.scene_list = [];
    } else if (url.includes("/api/getconfig") && Array.isArray(obj.list)) {
      obj.list = obj.list.map((item) => {
        if (item.conf_key === "public_system_setting" && item.value) {
          try {
            let val = JSON.parse(item.value);
            val.home_story_entrance_enable = 0;
            val.feedChannelBarTitleStringArray = [];
            val.feedChannelBarIdStringArray = [];
            item.value = JSON.stringify(val);
            item.version = 19999;
          } catch (e) {}
        }
        return item;
      });
    } else if (url.includes("/api/getsyscfg")) {
      const ver = 1999113365;
      obj.bdpan_multi_sections_home_config_area = {
        cfg_version: ver,
        cfg_list: [
          { cfg_version: 99, node_key: "bdpan_msh_home_album_story_image_check_config_node_v1", bdpan_msh_home_album_story_image_check_config_key: "0" },
          { cfg_version: 99, node_key: "bdpan_msh_home_album_story_image_check_config_node", bdpan_msh_home_album_story_image_check_config_key: "0" },
          { cfg_version: 99, node_key: "bdpan_msh_home_recent_mmkv_cache_config_node", node_name: "iPhone首页最近缓存开关", open: "0" }
        ]
      };
      obj.new_feed_home_area = {
        cfg_version: ver,
        cfg_list: [
          { cfg_version: 99, node_key: "bdpan_home_leftview_auto_backup_status_guide_config_node", open: "0" },
          { cfg_version: 99, node_key: "bdpan_home_backup_status_guide_config_node", open: "0" },
          { cfg_version: 99, node_key: "node_feed_home_backup_card", show_local_image_switch: "0" },
          { cfg_version: 99, node_key: "node_feed_home_config", open: "0" }
        ]
      };
      obj.album_story_config = {
        cfg_version: ver,
        cfg_list: [
          { cfg_version: 99, node_key: "node_album_home_story", new_story_switch: "0", home_1pic_animation_enabled: "0", home_animate_play_enabled: "0", home_video_play_enabled: "0", home_video_preload_enabled: "0", home_video_preload_transcoding_enabled: "0" },
          { cfg_version: 99, node_key: "node_album_video_story", story_video_enabled: "0", home_livp_play_enabled: "0", home_video_play_enabled: "0", detail_livp_play_enabled: "0", detail_video_play_enabled: "0" },
          { cfg_version: 99, node_key: "node_album_island", story_island_open: "0" }
        ]
      };
      obj.bdpan_feed_home_config_area_v12 = {
        cfg_version: ver,
        cfg_list: [
          { cfg_version: 99, node_key: "bdpan_feed_home_config_launched_opt_node", open: "0" },
          { cfg_version: 99, node_key: "bdpan_feed_home_config_auto_play_node", creativity_open: "0" },
          { cfg_version: 99, node_key: "bdpan_feed_home_config_recommend_node", open: "0" }
        ]
      };
      obj.feeddata_excavate_area = {
        cfg_version: ver,
        cfg_list: [
          { cfg_version: 99, node_key: "feeddata_excavate_preference_node", switch: "0", count: "0" },
          { cfg_version: 99, node_key: "feeddata_excavate_recent_node", switch: "0", count: "0", per_count: "0" },
          { cfg_version: 99, node_key: "feeddata_excavate_transfer_node", switch: "0", count: "0" }
        ]
      };
      obj.bdpan_home_launched_alert_config_area = {
        cfg_version: ver,
        cfg_list: [{ cfg_version: 99, node_key: "bdpan_home_launched_alert_config_node", open: "0" }]
      };
      obj.public_guide_config = {
        cfg_version: ver,
        cfg_list: [
          { cfg_version: 99, close_max_count: "0", interval_day: "999", node_key: "auto_backup_guide_bar", switch: "0" },
          { cfg_version: 99, close_max_count: "0", interval_day: "999", node_key: "photo_authoration_guide_bar", switch: "0" }
        ]
      };
    }

    $done({ body: JSON.stringify(obj) });
  } catch (err) {
    $done({});
  }
}
