export interface Region {
  name: string
  code: string
}

export interface City {
  name: string
  code: string
  districts: Region[]
}

export interface Province {
  name: string
  code: string
  cities: City[]
}

export const chinaRegions: Province[] = [
  {
    name: '北京市',
    code: '110000',
    cities: [
      {
        name: '北京市',
        code: '110100',
        districts: [
          { name: '东城区', code: '110101' },
          { name: '西城区', code: '110102' },
          { name: '朝阳区', code: '110105' },
          { name: '丰台区', code: '110106' },
          { name: '石景山区', code: '110107' },
          { name: '海淀区', code: '110108' },
          { name: '门头沟区', code: '110109' },
          { name: '房山区', code: '110111' },
          { name: '通州区', code: '110112' },
          { name: '顺义区', code: '110113' },
          { name: '昌平区', code: '110114' },
          { name: '大兴区', code: '110115' },
          { name: '怀柔区', code: '110116' },
          { name: '平谷区', code: '110117' },
          { name: '密云区', code: '110118' },
          { name: '延庆区', code: '110119' },
        ],
      },
    ],
  },
  {
    name: '天津市',
    code: '120000',
    cities: [
      {
        name: '天津市',
        code: '120100',
        districts: [
          { name: '和平区', code: '120101' },
          { name: '河东区', code: '120102' },
          { name: '河西区', code: '120103' },
          { name: '南开区', code: '120104' },
          { name: '河北区', code: '120105' },
          { name: '红桥区', code: '120106' },
          { name: '东丽区', code: '120110' },
          { name: '西青区', code: '120111' },
          { name: '津南区', code: '120112' },
          { name: '北辰区', code: '120113' },
          { name: '武清区', code: '120114' },
          { name: '宝坻区', code: '120115' },
          { name: '滨海新区', code: '120116' },
          { name: '宁河区', code: '120117' },
          { name: '静海区', code: '120118' },
          { name: '蓟州区', code: '120119' },
        ],
      },
    ],
  },
  {
    name: '河北省',
    code: '130000',
    cities: [
      {
        name: '石家庄市',
        code: '130100',
        districts: [
          { name: '长安区', code: '130102' },
          { name: '桥西区', code: '130104' },
          { name: '新华区', code: '130105' },
          { name: '裕华区', code: '130108' },
          { name: '藁城区', code: '130109' },
          { name: '鹿泉区', code: '130110' },
          { name: '栾城区', code: '130111' },
          { name: '正定县', code: '130123' },
          { name: '井陉县', code: '130121' },
          { name: '行唐县', code: '130125' },
        ],
      },
      {
        name: '唐山市',
        code: '130200',
        districts: [
          { name: '路南区', code: '130202' },
          { name: '路北区', code: '130203' },
          { name: '古冶区', code: '130204' },
          { name: '开平区', code: '130205' },
          { name: '丰南区', code: '130207' },
          { name: '丰润区', code: '130208' },
          { name: '曹妃甸区', code: '130209' },
          { name: '滦州市', code: '130284' },
        ],
      },
      {
        name: '保定市',
        code: '130600',
        districts: [
          { name: '竞秀区', code: '130602' },
          { name: '莲池区', code: '130606' },
          { name: '满城区', code: '130607' },
          { name: '清苑区', code: '130608' },
          { name: '徐水区', code: '130609' },
          { name: '涿州市', code: '130681' },
        ],
      },
      {
        name: '邯郸市',
        code: '130400',
        districts: [
          { name: '邯山区', code: '130402' },
          { name: '丛台区', code: '130403' },
          { name: '复兴区', code: '130404' },
          { name: '峰峰矿区', code: '130406' },
          { name: '永年区', code: '130408' },
        ],
      },
      {
        name: '秦皇岛市',
        code: '130300',
        districts: [
          { name: '海港区', code: '130302' },
          { name: '山海关区', code: '130303' },
          { name: '北戴河区', code: '130304' },
          { name: '抚宁区', code: '130306' },
        ],
      },
    ],
  },
  {
    name: '山西省',
    code: '140000',
    cities: [
      {
        name: '太原市',
        code: '140100',
        districts: [
          { name: '小店区', code: '140105' },
          { name: '迎泽区', code: '140106' },
          { name: '杏花岭区', code: '140107' },
          { name: '尖草坪区', code: '140108' },
          { name: '万柏林区', code: '140109' },
          { name: '晋源区', code: '140110' },
          { name: '清徐县', code: '140121' },
        ],
      },
      {
        name: '大同市',
        code: '140200',
        districts: [
          { name: '平城区', code: '140213' },
          { name: '云冈区', code: '140214' },
          { name: '新荣区', code: '140212' },
          { name: '云州区', code: '140215' },
        ],
      },
      {
        name: '晋中市',
        code: '140700',
        districts: [
          { name: '榆次区', code: '140702' },
          { name: '太谷区', code: '140703' },
          { name: '介休市', code: '140781' },
        ],
      },
    ],
  },
  {
    name: '内蒙古自治区',
    code: '150000',
    cities: [
      {
        name: '呼和浩特市',
        code: '150100',
        districts: [
          { name: '新城区', code: '150102' },
          { name: '回民区', code: '150103' },
          { name: '玉泉区', code: '150104' },
          { name: '赛罕区', code: '150105' },
          { name: '土默特左旗', code: '150121' },
        ],
      },
      {
        name: '包头市',
        code: '150200',
        districts: [
          { name: '东河区', code: '150202' },
          { name: '昆都仑区', code: '150203' },
          { name: '青山区', code: '150204' },
          { name: '石拐区', code: '150205' },
        ],
      },
      {
        name: '鄂尔多斯市',
        code: '150600',
        districts: [
          { name: '东胜区', code: '150602' },
          { name: '康巴什区', code: '150603' },
          { name: '伊金霍洛旗', code: '150627' },
        ],
      },
    ],
  },
  {
    name: '辽宁省',
    code: '210000',
    cities: [
      {
        name: '沈阳市',
        code: '210100',
        districts: [
          { name: '和平区', code: '210102' },
          { name: '沈河区', code: '210103' },
          { name: '大东区', code: '210104' },
          { name: '皇姑区', code: '210105' },
          { name: '铁西区', code: '210106' },
          { name: '苏家屯区', code: '210111' },
          { name: '浑南区', code: '210112' },
        ],
      },
      {
        name: '大连市',
        code: '210200',
        districts: [
          { name: '中山区', code: '210202' },
          { name: '西岗区', code: '210203' },
          { name: '沙河口区', code: '210204' },
          { name: '甘井子区', code: '210211' },
          { name: '旅顺口区', code: '210212' },
          { name: '金州区', code: '210213' },
        ],
      },
      {
        name: '鞍山市',
        code: '210300',
        districts: [
          { name: '铁东区', code: '210302' },
          { name: '铁西区', code: '210303' },
          { name: '立山区', code: '210304' },
          { name: '千山区', code: '210311' },
        ],
      },
    ],
  },
  {
    name: '吉林省',
    code: '220000',
    cities: [
      {
        name: '长春市',
        code: '220100',
        districts: [
          { name: '南关区', code: '220102' },
          { name: '宽城区', code: '220103' },
          { name: '朝阳区', code: '220104' },
          { name: '二道区', code: '220105' },
          { name: '绿园区', code: '220106' },
          { name: '双阳区', code: '220112' },
          { name: '九台区', code: '220113' },
        ],
      },
      {
        name: '吉林市',
        code: '220200',
        districts: [
          { name: '昌邑区', code: '220202' },
          { name: '龙潭区', code: '220203' },
          { name: '船营区', code: '220204' },
          { name: '丰满区', code: '220211' },
        ],
      },
    ],
  },
  {
    name: '黑龙江省',
    code: '230000',
    cities: [
      {
        name: '哈尔滨市',
        code: '230100',
        districts: [
          { name: '道里区', code: '230102' },
          { name: '南岗区', code: '230103' },
          { name: '道外区', code: '230104' },
          { name: '香坊区', code: '230110' },
          { name: '松北区', code: '230109' },
          { name: '呼兰区', code: '230111' },
        ],
      },
      {
        name: '齐齐哈尔市',
        code: '230200',
        districts: [
          { name: '龙沙区', code: '230202' },
          { name: '建华区', code: '230203' },
          { name: '铁锋区', code: '230204' },
          { name: '昂昂溪区', code: '230205' },
        ],
      },
    ],
  },
  {
    name: '上海市',
    code: '310000',
    cities: [
      {
        name: '上海市',
        code: '310100',
        districts: [
          { name: '黄浦区', code: '310101' },
          { name: '徐汇区', code: '310104' },
          { name: '长宁区', code: '310105' },
          { name: '静安区', code: '310106' },
          { name: '普陀区', code: '310107' },
          { name: '虹口区', code: '310109' },
          { name: '杨浦区', code: '310110' },
          { name: '浦东新区', code: '310115' },
          { name: '闵行区', code: '310112' },
          { name: '宝山区', code: '310113' },
          { name: '嘉定区', code: '310114' },
          { name: '金山区', code: '310116' },
          { name: '松江区', code: '310117' },
          { name: '青浦区', code: '310118' },
          { name: '奉贤区', code: '310120' },
          { name: '崇明区', code: '310151' },
        ],
      },
    ],
  },
  {
    name: '江苏省',
    code: '320000',
    cities: [
      {
        name: '南京市',
        code: '320100',
        districts: [
          { name: '玄武区', code: '320102' },
          { name: '秦淮区', code: '320104' },
          { name: '建邺区', code: '320105' },
          { name: '鼓楼区', code: '320106' },
          { name: '浦口区', code: '320111' },
          { name: '栖霞区', code: '320113' },
          { name: '雨花台区', code: '320114' },
          { name: '江宁区', code: '320115' },
        ],
      },
      {
        name: '苏州市',
        code: '320500',
        districts: [
          { name: '姑苏区', code: '320508' },
          { name: '虎丘区', code: '320505' },
          { name: '吴中区', code: '320506' },
          { name: '相城区', code: '320507' },
          { name: '吴江区', code: '320509' },
          { name: '昆山市', code: '320583' },
          { name: '张家港市', code: '320582' },
        ],
      },
      {
        name: '无锡市',
        code: '320200',
        districts: [
          { name: '梁溪区', code: '320213' },
          { name: '锡山区', code: '320205' },
          { name: '惠山区', code: '320206' },
          { name: '滨湖区', code: '320211' },
          { name: '江阴市', code: '320281' },
        ],
      },
      {
        name: '常州市',
        code: '320400',
        districts: [
          { name: '天宁区', code: '320402' },
          { name: '钟楼区', code: '320404' },
          { name: '新北区', code: '320411' },
          { name: '武进区', code: '320412' },
        ],
      },
    ],
  },
  {
    name: '浙江省',
    code: '330000',
    cities: [
      {
        name: '杭州市',
        code: '330100',
        districts: [
          { name: '上城区', code: '330102' }, // 原上城区+江干区合并
          { name: '拱墅区', code: '330105' }, // 原拱墅区+下城区合并
          { name: '西湖区', code: '330106' },
          { name: '滨江区', code: '330108' },
          { name: '萧山区', code: '330109' },
          { name: '余杭区', code: '330110' },
          { name: '临平区', code: '330113' },
          { name: '钱塘区', code: '330114' },
        ],
      },
      {
        name: '宁波市',
        code: '330200',
        districts: [
          { name: '海曙区', code: '330203' },
          { name: '江北区', code: '330205' },
          { name: '北仑区', code: '330206' },
          { name: '镇海区', code: '330211' },
          { name: '鄞州区', code: '330212' },
        ],
      },
      {
        name: '温州市',
        code: '330300',
        districts: [
          { name: '鹿城区', code: '330302' },
          { name: '龙湾区', code: '330303' },
          { name: '瓯海区', code: '330304' },
          { name: '洞头区', code: '330305' },
        ],
      },
    ],
  },
  {
    name: '安徽省',
    code: '340000',
    cities: [
      {
        name: '合肥市',
        code: '340100',
        districts: [
          { name: '瑶海区', code: '340102' },
          { name: '庐阳区', code: '340103' },
          { name: '蜀山区', code: '340104' },
          { name: '包河区', code: '340111' },
          { name: '肥东县', code: '340122' },
          { name: '肥西县', code: '340123' },
        ],
      },
      {
        name: '芜湖市',
        code: '340200',
        districts: [
          { name: '镜湖区', code: '340202' },
          { name: '弋江区', code: '340203' },
          { name: '鸠江区', code: '340207' },
          { name: '湾沚区', code: '340209' },
        ],
      },
    ],
  },
  {
    name: '福建省',
    code: '350000',
    cities: [
      {
        name: '福州市',
        code: '350100',
        districts: [
          { name: '鼓楼区', code: '350102' },
          { name: '台江区', code: '350103' },
          { name: '仓山区', code: '350104' },
          { name: '马尾区', code: '350105' },
          { name: '晋安区', code: '350111' },
          { name: '长乐区', code: '350112' },
        ],
      },
      {
        name: '厦门市',
        code: '350200',
        districts: [
          { name: '思明区', code: '350203' },
          { name: '海沧区', code: '350205' },
          { name: '湖里区', code: '350206' },
          { name: '集美区', code: '350211' },
        ],
      },
    ],
  },
  {
    name: '江西省',
    code: '360000',
    cities: [
      {
        name: '南昌市',
        code: '360100',
        districts: [
          { name: '东湖区', code: '360102' },
          { name: '西湖区', code: '360103' },
          { name: '青云谱区', code: '360104' },
          { name: '青山湖区', code: '360111' },
          { name: '新建区', code: '360112' },
          { name: '红谷滩区', code: '360113' },
        ],
      },
      {
        name: '赣州市',
        code: '360700',
        districts: [
          { name: '章贡区', code: '360702' },
          { name: '南康区', code: '360703' },
          { name: '赣县区', code: '360704' },
        ],
      },
    ],
  },
  {
    name: '山东省',
    code: '370000',
    cities: [
      {
        name: '济南市',
        code: '370100',
        districts: [
          { name: '历下区', code: '370102' },
          { name: '市中区', code: '370103' },
          { name: '槐荫区', code: '370104' },
          { name: '天桥区', code: '370105' },
          { name: '历城区', code: '370112' },
          { name: '长清区', code: '370113' },
          { name: '章丘区', code: '370114' },
        ],
      },
      {
        name: '青岛市',
        code: '370200',
        districts: [
          { name: '市南区', code: '370202' },
          { name: '市北区', code: '370203' },
          { name: '黄岛区', code: '370211' },
          { name: '崂山区', code: '370212' },
          { name: '城阳区', code: '370214' },
          { name: '即墨区', code: '370215' },
        ],
      },
      {
        name: '烟台市',
        code: '370600',
        districts: [
          { name: '芝罘区', code: '370602' },
          { name: '福山区', code: '370611' },
          { name: '莱山区', code: '370613' },
          { name: '蓬莱区', code: '370614' },
        ],
      },
    ],
  },
  {
    name: '河南省',
    code: '410000',
    cities: [
      {
        name: '郑州市',
        code: '410100',
        districts: [
          { name: '中原区', code: '410102' },
          { name: '二七区', code: '410103' },
          { name: '管城回族区', code: '410104' },
          { name: '金水区', code: '410105' },
          { name: '上街区', code: '410106' },
          { name: '惠济区', code: '410108' },
          { name: '中牟县', code: '410122' },
        ],
      },
      {
        name: '洛阳市',
        code: '410300',
        districts: [
          { name: '老城区', code: '410302' },
          { name: '西工区', code: '410303' },
          { name: '瀍河回族区', code: '410304' },
          { name: '涧西区', code: '410305' },
        ],
      },
    ],
  },
  {
    name: '湖北省',
    code: '420000',
    cities: [
      {
        name: '武汉市',
        code: '420100',
        districts: [
          { name: '江岸区', code: '420102' },
          { name: '江汉区', code: '420103' },
          { name: '硚口区', code: '420104' },
          { name: '汉阳区', code: '420105' },
          { name: '武昌区', code: '420106' },
          { name: '青山区', code: '420107' },
          { name: '洪山区', code: '420111' },
          { name: '东西湖区', code: '420112' },
        ],
      },
      {
        name: '宜昌市',
        code: '420500',
        districts: [
          { name: '西陵区', code: '420502' },
          { name: '伍家岗区', code: '420503' },
          { name: '点军区', code: '420504' },
          { name: '猇亭区', code: '420505' },
        ],
      },
    ],
  },
  {
    name: '湖南省',
    code: '430000',
    cities: [
      {
        name: '长沙市',
        code: '430100',
        districts: [
          { name: '芙蓉区', code: '430102' },
          { name: '天心区', code: '430103' },
          { name: '岳麓区', code: '430104' },
          { name: '开福区', code: '430105' },
          { name: '雨花区', code: '430111' },
          { name: '望城区', code: '430112' },
          { name: '长沙县', code: '430121' },
        ],
      },
      {
        name: '株洲市',
        code: '430200',
        districts: [
          { name: '荷塘区', code: '430202' },
          { name: '芦淞区', code: '430203' },
          { name: '石峰区', code: '430204' },
          { name: '天元区', code: '430211' },
        ],
      },
    ],
  },
  {
    name: '广东省',
    code: '440000',
    cities: [
      {
        name: '广州市',
        code: '440100',
        districts: [
          { name: '越秀区', code: '440104' },
          { name: '海珠区', code: '440105' },
          { name: '荔湾区', code: '440103' },
          { name: '天河区', code: '440106' },
          { name: '白云区', code: '440111' },
          { name: '黄埔区', code: '440112' },
          { name: '番禺区', code: '440113' },
          { name: '花都区', code: '440114' },
        ],
      },
      {
        name: '深圳市',
        code: '440300',
        districts: [
          { name: '罗湖区', code: '440303' },
          { name: '福田区', code: '440304' },
          { name: '南山区', code: '440305' },
          { name: '宝安区', code: '440306' },
          { name: '龙岗区', code: '440307' },
          { name: '龙华区', code: '440309' },
          { name: '坪山区', code: '440310' },
          { name: '光明区', code: '440311' },
        ],
      },
      {
        name: '东莞市',
        code: '441900',
        districts: [
          { name: '莞城街道', code: '441901' },
          { name: '南城街道', code: '441902' },
          { name: '东城街道', code: '441903' },
          { name: '万江街道', code: '441904' },
          { name: '长安镇', code: '441955' },
        ],
      },
      {
        name: '佛山市',
        code: '440600',
        districts: [
          { name: '禅城区', code: '440604' },
          { name: '南海区', code: '440605' },
          { name: '顺德区', code: '440606' },
          { name: '三水区', code: '440607' },
          { name: '高明区', code: '440608' }
        ]
      },
      {
        name: '中山市',
        code: '442000',
        districts: [
          { name: '石岐街道', code: '442001' },
          { name: '东区街道', code: '442002' },
          { name: '西区街道', code: '442003' },
          { name: '南区街道', code: '442004' },
          { name: '火炬开发区', code: '442055' },
        ],
      },
    ],
  },
  {
    name: '广西壮族自治区',
    code: '450000',
    cities: [
      {
        name: '南宁市',
        code: '450100',
        districts: [
          { name: '兴宁区', code: '450102' },
          { name: '青秀区', code: '450103' },
          { name: '江南区', code: '450105' },
          { name: '西乡塘区', code: '450107' },
          { name: '良庆区', code: '450108' },
          { name: '邕宁区', code: '450109' },
        ],
      },
      {
        name: '柳州市',
        code: '450200',
        districts: [
          { name: '城中区', code: '450202' },
          { name: '鱼峰区', code: '450203' },
          { name: '柳南区', code: '450204' },
          { name: '柳北区', code: '450205' },
        ],
      },
    ],
  },
  {
    name: '海南省',
    code: '460000',
    cities: [
      {
        name: '海口市',
        code: '460100',
        districts: [
          { name: '秀英区', code: '460105' },
          { name: '龙华区', code: '460106' },
          { name: '琼山区', code: '460107' },
          { name: '美兰区', code: '460108' },
        ],
      },
      {
        name: '三亚市',
        code: '460200',
        districts: [
          { name: '海棠区', code: '460202' },
          { name: '吉阳区', code: '460203' },
          { name: '天涯区', code: '460204' },
          { name: '崖州区', code: '460205' },
        ],
      },
      {
        name: '三沙市',
        code: '460300',
        districts: [{ name: '西沙区', code: '460302' }, { name: '南沙区', code: '460303' }],
      },
    ],
  },
  {
    name: '重庆市',
    code: '500000',
    cities: [
      {
        name: '重庆市',
        code: '500100',
        districts: [
          { name: '万州区', code: '500101' },
          { name: '涪陵区', code: '500102' },
          { name: '渝中区', code: '500103' },
          { name: '大渡口区', code: '500104' },
          { name: '江北区', code: '500105' },
          { name: '沙坪坝区', code: '500106' },
          { name: '九龙坡区', code: '500107' },
          { name: '南岸区', code: '500108' },
          { name: '北碚区', code: '500109' },
        ],
      },
    ],
  },
  {
    name: '四川省',
    code: '510000',
    cities: [
      {
        name: '成都市',
        code: '510100',
        districts: [
          { name: '锦江区', code: '510104' },
          { name: '青羊区', code: '510105' },
          { name: '金牛区', code: '510106' },
          { name: '武侯区', code: '510107' },
          { name: '成华区', code: '510108' },
          { name: '龙泉驿区', code: '510112' },
          { name: '青白江区', code: '510113' },
        ],
      },
      {
        name: '绵阳市',
        code: '510700',
        districts: [
          { name: '涪城区', code: '510703' },
          { name: '游仙区', code: '510704' },
          { name: '安州区', code: '510705' },
        ],
      },
    ],
  },
  {
    name: '贵州省',
    code: '520000',
    cities: [
      {
        name: '贵阳市',
        code: '520100',
        districts: [
          { name: '南明区', code: '520102' },
          { name: '云岩区', code: '520103' },
          { name: '花溪区', code: '520111' },
          { name: '乌当区', code: '520112' },
          { name: '观山湖区', code: '520115' },
        ],
      },
      {
        name: '遵义市',
        code: '520300',
        districts: [
          { name: '红花岗区', code: '520302' },
          { name: '汇川区', code: '520303' },
          { name: '播州区', code: '520304' },
        ],
      },
    ],
  },
  {
    name: '云南省',
    code: '530000',
    cities: [
      {
        name: '昆明市',
        code: '530100',
        districts: [
          { name: '五华区', code: '530102' },
          { name: '盘龙区', code: '530103' },
          { name: '官渡区', code: '530111' },
          { name: '西山区', code: '530112' },
          { name: '呈贡区', code: '530114' },
        ],
      },
      {
        name: '大理白族自治州',
        code: '532900',
        districts: [
          { name: '大理市', code: '532901' },
          { name: '漾濞彝族自治县', code: '532922' },
        ],
      },
    ],
  },
  {
    name: '西藏自治区',
    code: '540000',
    cities: [
      {
        name: '拉萨市',
        code: '540100',
        districts: [
          { name: '城关区', code: '540102' },
          { name: '林周县', code: '540121' },
          { name: '当雄县', code: '540122' },
          { name: '尼木县', code: '540123' },
        ],
      },
      {
        name: '日喀则市',
        code: '540200',
        districts: [{ name: '桑珠孜区', code: '540202' }, { name: '南木林县', code: '540221' }],
      },
    ],
  },
  {
    name: '陕西省',
    code: '610000',
    cities: [
      {
        name: '西安市',
        code: '610100',
        districts: [
          { name: '新城区', code: '610102' },
          { name: '碑林区', code: '610103' },
          { name: '莲湖区', code: '610104' },
          { name: '灞桥区', code: '610111' },
          { name: '未央区', code: '610112' },
          { name: '雁塔区', code: '610113' },
          { name: '阎良区', code: '610114' },
        ],
      },
      {
        name: '宝鸡市',
        code: '610300',
        districts: [
          { name: '渭滨区', code: '610302' },
          { name: '金台区', code: '610303' },
          { name: '陈仓区', code: '610304' },
        ],
      },
    ],
  },
  {
    name: '甘肃省',
    code: '620000',
    cities: [
      {
        name: '兰州市',
        code: '620100',
        districts: [
          { name: '城关区', code: '620102' },
          { name: '七里河区', code: '620103' },
          { name: '西固区', code: '620104' },
          { name: '安宁区', code: '620105' },
          { name: '红古区', code: '620111' },
        ],
      },
      {
        name: '天水市',
        code: '620500',
        districts: [
          { name: '秦州区', code: '620502' },
          { name: '麦积区', code: '620503' },
        ],
      },
    ],
  },
  {
    name: '青海省',
    code: '630000',
    cities: [
      {
        name: '西宁市',
        code: '630100',
        districts: [
          { name: '城东区', code: '630102' },
          { name: '城中区', code: '630103' },
          { name: '城西区', code: '630104' },
          { name: '城北区', code: '630105' },
          { name: '湟中区', code: '630106' },
        ],
      },
      {
        name: '海东市',
        code: '630200',
        districts: [{ name: '乐都区', code: '630202' }, { name: '平安区', code: '630203' }],
      },
    ],
  },
  {
    name: '宁夏回族自治区',
    code: '640000',
    cities: [
      {
        name: '银川市',
        code: '640100',
        districts: [
          { name: '兴庆区', code: '640104' },
          { name: '西夏区', code: '640105' },
          { name: '金凤区', code: '640106' },
          { name: '灵武市', code: '640181' },
        ],
      },
      {
        name: '吴忠市',
        code: '640300',
        districts: [{ name: '利通区', code: '640302' }, { name: '红寺堡区', code: '640303' }],
      },
    ],
  },
  {
    name: '新疆维吾尔自治区',
    code: '650000',
    cities: [
      {
        name: '乌鲁木齐市',
        code: '650100',
        districts: [
          { name: '天山区', code: '650102' },
          { name: '沙依巴克区', code: '650103' },
          { name: '新市区', code: '650104' },
          { name: '水磨沟区', code: '650105' },
          { name: '头屯河区', code: '650106' },
        ],
      },
      {
        name: '喀什地区',
        code: '653100',
        districts: [{ name: '喀什市', code: '653101' }, { name: '疏附县', code: '653121' }],
      },
    ],
  },
  {
    name: '香港特别行政区',
    code: '810000',
    cities: [{ name: '香港特别行政区', code: '810100', districts: [{ name: '香港岛', code: '810101' }, { name: '九龙', code: '810102' }, { name: '新界', code: '810103' }] }],
  },
  {
    name: '澳门特别行政区',
    code: '820000',
    cities: [{ name: '澳门特别行政区', code: '820100', districts: [{ name: '澳门半岛', code: '820101' }, { name: '氹仔岛', code: '820102' }, { name: '路环岛', code: '820103' }] }],
  },
  {
    name: '台湾省',
    code: '710000',
    cities: [
      {
        name: '台北市',
        code: '710100',
        districts: [{ name: '中正区', code: '710101' }, { name: '信义区', code: '710102' }, { name: '松山区', code: '710103' }],
      },
      {
        name: '高雄市',
        code: '710200',
        districts: [{ name: '苓雅区', code: '710201' }, { name: '前金区', code: '710202' }, { name: '新兴区', code: '710203' }],
      },
    ],
  },
]