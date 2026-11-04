// 百度网盘 iOS 首页净化 + 彻底禁用内置 P2P/PCDN 上传与打洞 (Surge http-response script)
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
    } else if (url.includes("/cms/config")) {
      // 禁用百度网盘 CMS 下发的 P2P 上传比例与 P2SP 调度
      if (obj.cfg) {
        if (obj.cfg.p2p_switch_param) {
          obj.cfg.p2p_switch_param.basic_speed = 0;
          obj.cfg.p2p_switch_param.p2pu_percent = 0;
          obj.cfg.p2p_switch_param.spup_peer = 0;
          obj.cfg.p2p_switch_param.spup_percent = 0;
        }
        if (obj.cfg.p2sp_time_sharing) {
          obj.cfg.p2sp_time_sharing.enable = 0;
          obj.cfg.p2sp_time_sharing.p2p_check = 0;
          obj.cfg.p2sp_time_sharing.p2p_high_speed = 0;
          obj.cfg.p2sp_time_sharing.p2p_low_speed = 0;
          obj.cfg.p2sp_time_sharing.p2p_only_speed = 0;
        }
      }
    } else if (url.includes("/api/getconfig") && Array.isArray(obj.list)) {
      obj.list = obj.list.map((item) => {
        if (item.conf_key === "public_system_setting" && item.value) {
          try {
            let val = JSON.parse(item.value);
            // 首页回忆与推荐频道入口关闭
            val.home_story_entrance_enable = 0;
            val.feedChannelBarTitleStringArray = [];
            val.feedChannelBarIdStringArray = [];
            // 彻底关闭 P2P 下载与边播边走 P2P 模式
            val.p2pdownload_switch = 0;
            val.p2psdk_download_switch = 0;
            val.p2psdk_download_streaming_switch = 0;
            val.p2psdk_preview_download_switch = 0;
            val.playmediainp2pmodeswitch = 0;
            val.playmediainp2pmode_transcode = 0;
            val.playmediainp2pmode_origin = 0;
            val.playmediainp2pmode_720 = 0;
            val.playmediainp2pmode_360 = 0;
            val.playmediainp2pmode_1080 = 0;
            item.value = JSON.stringify(val);
            item.version = 29999;
          } catch (e) {}
        }
        return item;
      });
    } else if (url.includes("/api/getsyscfg")) {
      const ver = 2999113365;
      // 1. 彻底关闭 iOS P2P SDK 后台上传、UPnP 路由器打洞、纯 IP 打洞节点与 IPv6 探测
      obj.p2p_sdk_config_ios = {
        cfg_version: 99922112174,
        cfg_list: [
          {
            cfg_version: 99,
            node_key: "p2p_sdk_global_config_ios",
            node_name: "IOSp2p-sdk-global-config",
            p2p_sdk_global_config_ios: JSON.stringify({
              application: { ver: "99" },
              business: {
                ver: "99",
                _large_request_speed_threshold: "104857600",
                use_detect_speed_pop: "0",
                use_network_probe: "0",
                network_probe_ratio: "0",
                use_pop_ratio: "0",
                network_probe_interval: "86400"
              },
              debug: { ver: "99" },
              network: {
                ver: "99",
                hole_hosts: "",
                online_hosts: "",
                upload_enabled: "0",
                upload_on_play: "0",
                upload_on_download: "0",
                upload_all_time: "0",
                upload_ts: "0",
                upload_yh: "0",
                upload_current_file_only: "1",
                upload_limit: "1",
                upload_filesize_limit: "0",
                max_upload_peer_count: "0",
                upload_speed_limit: "0",
                wifi_steady_seconds: "999999",
                filemetas_min_size: "2147483647"
              },
              system_limit: {
                ver: "99",
                upnp_on: "0",
                ping_online_tmo: "0",
                ping_online_interval: "86400"
              }
            })
          }
        ]
      };
      // 2. 首页净化与关闭 MMKV 缓存
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
