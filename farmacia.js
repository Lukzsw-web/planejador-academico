/* farmacia.js — FarmacIA: ementas do PPC, regras e o assistente de perguntas (sem IA generativa).
 * Cada seção abaixo era um arquivo próprio; a ordem das seções importa (scripts clássicos compartilham globais). */

// =====================================================================
// Seção: farmacia-ementas
// =====================================================================
/* FarmacIA: ementas e objetivos das disciplinas, copiados do PPC de Farmácia (apenas as que constam no PPC). */
window.FarmaEmentas = {"BMW103":["Visão integrada da anatomia, histologia e embriologia dos principais sistemas corporais, como os sistemas locomotor, nervoso, cardiovascular, respiratório, digestório, urinário e endócrino. Estudo dos tecidos básicos em histologia, a organização morfofuncional dos órgãos e sistema, e embriologia básica, incluindo gametogênese e desenvolvimento embrionário até a quarta semana de gestação.","Compreender de forma integrada a anatomia, histologia e embriologia dos principais sistemas corporais, incluindo a estrutura dos tecidos, a organização dos órgãos e o desenvolvimento embrionário até a quarta semana."],"BQM101":["Introdução a Bioquímica: Biomoléculas e Interações moleculares. Nucleotídeos e ácidos nucléicos: Estrutura e função, Nucleotídeos envolvidos no metabolismo, Estrutura de ácidos nucléicos, Replicação e transcrição do DNA. Aminoácidos: Estrutura e função, Parâmetros físico-químicos, Titulação, Peptídios. Proteínas: Estrutura e função, Enovelamento, Propriedades físico-químicas, Proteínas globulares e fibrosas, Dosagem de proteínas. Enzimas: Conceitos básicos, Catálise, Cinética, Regulação. Carboidratos: Estrutura e função, Propriedades físico-químicas, Dosagem de carboidratos. Lipídeos: Estrutura e função, Propriedades físico-químicas, Lipoproteínas – estrutura e função. Vitaminas.","Compreender a estrutura, função e propriedades físico-químicas das principais biomoléculas — ácidos nucléicos, proteínas, enzimas, carboidratos, lipídeos e vitaminas — e seu papel nos processos bioquímicos fundamentais."],"MAC108":["Funções: Funções Elementares; Gráficos de Funções Elementares; Limite: Noções Intuitivas sobre Limite e Continuidade; Derivadas: Noção Qualitativa sobre Inclinação de Uma Linha Reta; Cálculo da Inclinação de Uma Reta; Definição de Derivada; Diferenciação de Funções de Uma Variável: Lineares, Polinomiais, Racionais e Trigonométricas; Regras de Diferenciação: Soma, Produto, Quociente e Regra da Cadeia; Derivadas das Funções Inversas; Derivadas das Funções Exponenciais e Logarítmicas; Taxa de Variação Média e Instantânea: Aplicações em Catálise; Aproximações Lineares e Manipulação de Erros Experimentais; Dosimetria Biológica e o Modelo Linear-Quadrático; Derivadas de Ordem Superior; Aplicação de Derivada: Máximos e Mínimos; Concavidade e Pontos de Inflexão; Assíntotas; Esboço de Gráficos Simples; Integração: Antiderivadas; Integral Indefinida de Funções Lineares, Polinomiais e Exponenciais; Integração de Uma Soma de Funções; Integral Definida e o Teorema Fundamental do Cálculo; Cálculo de Área entre Curvas; Valor Médio de Uma Função; Integração por Substituição Simples e por Partes; Aplicações a problemas de interesse da Farmácia.","Estudar os princípios básicos de funções, limites, derivadas e integrais, com foco em suas aplicações na análise de fenômenos e problemas da área farmacêutica."],"FFW111":["História e evolução da profissão farmacêutica. Panorama geral das áreas de atuação do farmacêutico: atenção farmacêutica, farmácia clínica, indústria farmacêutica, farmácia hospitalar, vigilância sanitária, análises clínicas, farmácia magistral, pesquisa e desenvolvimento, entre outras. O curso de Farmácia da UFRJ: perfil do egresso, competências e habilidades exigidas pelo mercado de trabalho. Conceitos básicos na área de Farmácia: fármaco, excipiente, medicamento, vigilância em saúde, uso racional, eficácia, segurança, adesão, formas farmacêuticas. Interdisciplinaridade na prática profissional. Humanização e acolhimento em saúde. Bases conceituais da Ética e da Bioética. Deontologia e princípios éticos da profissão farmacêutica.","Introduzir o estudante à profissão farmacêutica, suas áreas de atuação, bases conceituais e éticas, destacando o perfil do egresso e as competências requeridas na formação e no exercício profissional."],"IQG114":["Estequiometria. Teoria atômica. Classificação periódica. Ligação química, Composto de coordenação. Química nuclear.","Capacitar o aluno a compreender os princípios fundamentais da química geral — estequiometria, estrutura atômica, periodicidade, ligações químicas, compostos de coordenação e química nuclear — aplicando-os à formação e prática farmacêutica"],"BQM103":["Fundamentos do metabolismo celular: produção de energia, metabolismo de glicídeos, lipídeos e aminoácidos. Integração do metabolismo.","Compreender os fundamentos do metabolismo celular e a produção de energia, abordando o metabolismo integrado de glicídeos, lipídeos e aminoácidos."],"IQF235":["Conceitos e variáveis termodinâmicos. Matemática termodinâmica. Gases perfeitos. Primeira lei da termodinâmica. Termoquímica. Segunda e terceira leis da termodinâmica. Energia de Gibbs. Equações fundamentais. Substâncias puras.","Aplicar os conceitos fundamentais de termodinâmica ao estudo de processos físico-químicos envolvidos no desenvolvimento e na análise de fármacos e formulações farmacêuticas."],"CFF122":["A disciplina CFF está organizada para ministrar aulas sobre Fisiologia em seus seis sistemas. Neurofisiologia, Fisiologia Cardiovascular, Fisiologia Respiratória, Fisiologia Renal, Fisiologia Digestória e Fisiologia Endócrina. Em cada fisiologia, serão dados conceitos sobre estrutura e função e correlação com o controle de variáveis fundamentais para a manutenção do meio interno.","Compreender a fisiologia dos principais sistemas do corpo humano e sua importância na manutenção da homeostase, com ênfase nas aplicações farmacêuticas."],"FFW121":["Aspectos históricos, conceitos, paradigmas e configuração atual da saúde pública, das políticas e do sistema de saúde no Brasil; dinâmica do processo saúdedoença individual e coletivo; modelos de atenção à saúde; Sistema Único de Saúde (SUS) e políticas setoriais em saúde; Direito à Saúde; Promoção da Saúde; Vigilância e sistemas de informação; Segurança do paciente; Legislação e normas que regem as ações e políticas em saúde coletiva.","Compreender os fundamentos da saúde pública e das políticas de saúde no Brasil, com ênfase no SUS, na promoção da saúde e na atuação do farmacêutico em contextos coletivos."],"IQG122":["Simetria, Estrutura e Propriedades Atômicas, Eletronegatividade, Ligação Química.","Capacitar o aluno a compreender simetria, estrutura e propriedades atômicas, eletronegatividade e tipos de ligação química, aplicando esses conceitos à formação e prática farmacêutica"],"IQO120":["Conceitos Fundamentos. Mecânica Quântica. Orbitais Moleculares. Química dos Compostos Orgânicos: Grupos Funcionais, Estrutura, Nomenclatura e Propriedades FísicoQuímicas. Estereoquímica. Introdução às Reações: Mecanismos. Termodinâmica, Cinética, Catálise, Intermediários. Efeitos Estereoeletrônicos. Acidez e Basicidade. Reações de Adição Eletrofílica em Carbono Insaturado.","Compreender os conceitos fundamentais da química orgânica, incluindo estrutura, propriedades e reações dos compostos orgânicos, com ênfase em mecanismos e aplicações relevantes para a Farmácia."],"BMF310":["Farmacogenia; Farmacocinética qualitativa (estudos dos mecanismos de absorção, distribuição, metabolização e excreção); Farmacocinética quantitativa: modelos (1 e 2 compartimentos; cinética de primeira ordem e de ordem zero) e parâmetros (biodisponibilidade, depuração, tempo de meia-vida, volume aparente de distribuição); Doses únicas e repetidas; Interações farmacológicas; Monitorização de fármacos (aspectos farmacocinéticos); Receptores farmacológicos; Interação fármaco-receptor: conceito e abordagem quantitativa; Seletividade e segurança; Relação farmacocinética-farmacodinâmica. Farmacologia do Sistema Nervoso Autônomo","Compreender os princípios fundamentais da farmacocinética e farmacodinâmica, incluindo os mecanismos de ação, distribuição, metabolismo e excreção dos fármacos, bem como a relação entre suas propriedades cinéticas e efeitos farmacológicos, com ênfase na aplicação clínica e monitorização terapêutica."],"IQF232":["Termodinâmica das misturas. Atividade. Propriedades coligativas. Equilíbrios entre fases de sistemas binários. Reações e equilíbrios químicos. Misturas eletrolíticas. Eletroquímica. Líquidos. Viscosidade. Colóides. Cinética química e farmacocinética. Mecanismos de reações. Cinética enzimática. Difusão.","Aplicar os princípios da físico-química ao estudo de sistemas e processos relevantes à Farmácia, com ênfase em propriedades de misturas, equílíbrios químicos e de fases, eletroquímica, cinética e fenômenos de transporte."],"IQO220":["Conceitos, fundamentos teóricos, aparelhagem e interpretação envolvendo métodos espectrométricos na identificação de compostos orgânicos: espectrometria de massas, espectroscopia de absorção no infravermelho (IV), no ultravioleta-invisível (UV-Visível) e de ressonância magnética nuclear de 1HE de 13C","Compreender os fundamentos e aplicações dos principais métodos espectrométricos utilizados na identificação de compostos orgânicos, com ênfase na interpretação de dados espectrais."],"FFW231":["Conceitos, competências para o cuidado; integração e cenários de atuação, impactos do cuidado farmacêutico; Organização, estrutura, priorização, tipos e elementos mínimos para o desenvolvimento dos serviços clínicos. Plano de cuidado; semiologia farmacêutica, ferramentas e métodos (SOAP, TOM, PWDT, Dader) para o raciocínio clínico. Consulta farmacêutica, anamnese, exame clínico; boas práticas para prescrição farmacêutica, encaminhamento, intervenção e registro; comunicação e escuta; Indicadores de processo e resultados. Regulamentação.","Desenvolver competências para a prática clínica do farmacêutico, com foco no cuidado centrado no paciente, utilizando ferramentas e métodos para a tomada de decisão, planejamento e execução de serviços clínicos com base em boas práticas e regulamentações vigentes."],"FFW232":["Proporcionar aos alunos uma compreensão fundamental das análises clínicas, destacando sua relevância no cuidado farmacêutico e na prática clínica. A disciplina integra conhecimentos teóricos para compreensão da importância das análises clínicas no processo diagnóstico, monitoramento terapêutico e tomada de decisões clínicas. Discussão do papel do farmacêutico analista clínico na equipe multiprofissional de saúde. Abordagem dos tipos de amostras biológicas, técnicas de coleta, armazenamento e transporte. Interpretação de exames laboratoriais básicos e sua aplicação clínica. Princípios éticos, legais e normativos das análises clínicas. Introdução às Boas Práticas Laboratoriais (BPL) e à gestão da qualidade nas fases pré-analítica, analítica e pós-analítica. Estrutura e funcionamento de laboratórios clínicos. Legislação sanitária e campo de atuação do farmacêutico na área laboratorial, incluindo atuação em farmácias e consultórios. Conduta Ética Farmacêutica e confidencialidade dos dados.","Compreender a aplicação das análises clínicas no cuidado farmacêutico, integrando fundamentos técnicos, éticos e legais para a interpretação de exames laboratoriais e tomada de decisões clínicas em contextos multiprofissionais"],"IQA123":["Métodos gerais de análise. Teoria ácido-base aplicada à química analítica. Produto de solubilidade e compostos de coordenação associados a separação de íons. Classificação geral de cátios e ânions em grupos.","Habilitar o estudante a aplicar métodos de análise química, com ênfase em reações ácido-base, solubilidade e separação de íons, para a identificação e quantificação de substâncias de interesse farmacêutico."],"IQO230":["Reações de Adição Nucleofílica em Compostos Carbonilados: Aldeídos e Cetonas. Reações de Substituição Nucleofílica em Compostos Carbonilados: Ácidos Carboxílicos e Derivados. Reações de Substituição Nucleofílica em Carbono Saturado. Reações de Eliminação. Introdução ao Planejamento de Sínteses Multi-etapas de Substâncias Orgânicas: Retroanálise, Conceito de synthon, Grupos de Proteção.","Compreender os principais mecanismos de reações orgânicas envolvendo compostos insaturados, aromáticos e carbonilados, aplicando esses conhecimentos ao planejamento de sínteses orgânicas e à análise de transformações moleculares"],"FFW243":["Análise crítica das potencialidades e limitações dos métodos computacionais nas Ciências Farmacêuticas; Introdução à modelagem molecular nas Ciências Farmacêutica; Mecânica Molecular e Quântica; Modelagem de proteínas; Identificação de alvos terapêuticos; Linguagem de programação e análise de dados; Métodos de SAR/QSAR estatístico; Elaboração de Bancos de dados treinamento e teste em QS; Farmacocinética in silico - teoria e aplicações; Teoria e aplicações Toxicologia in silico: Métodos adotados para fins regulatórios: QSAR Estatístico e Alerta Estrutural; Simulação Farmacocinética in silico - PBPK; Métodos computacionais para otimização de estudos clínicos com aceitação regulatória.","Introduzir e aplicar métodos computacionais na modelagem molecular, análise de dados e simulações in silico, com foco no desenvolvimento, avaliação e otimização de fármacos e estudos clínicos."],"FFW242":["Introdução à Química Medicinal; Aspectos Moleculares da Biotransformação de Fármacos; Estudo da Relação Estrutura-Atividade e os principais grupos farmacofóricos; QSAR; Planejamento de fármacos; Interação Fármaco-Receptor; Estratégias de modificação molecular no planejamento de fármacos; Análise retrossintética; Síntese Orgânica Aplicada à Obtenção de Fármacos; Síntese de heterociclicos; A química verde na síntese de novos fármacos; Inovação no desenvolvimento de fármacos; Abordagem scale-up e scale-out.","Compreender os fundamentos da química medicinal aplicados ao planejamento, modificação e síntese de fármacos, com ênfase na relação estrutura-atividade, inovação e estratégias sustentáveis."],"IQA240":["Aplicação de equilíbrios químicos. Balança analítica. Determinações gravimétricas. Preparo de soluções. Determinações titulométricas de ácidos e bases. Determinações titulométricas de precipitação. Determinações titulométricas de complexos e de oxirredução.","Aplicar técnicas experimentais de análise química quantitativa, com ênfase nos equilíbrios químicos e métodos titulométricos, para a determinação de substâncias de interesse farmacêutico."],"IQA233":["Balança analítica: Fundamentos e tipos de pesagem. Fundamentos da gravimetria e determinações gravimétricas típicas. Fundamentos da titrimetria em reações ácido-base, de precipitação, de formação de complexos e de oxi-redução. Principais métodos.","Capacitar o estudante a utilizar técnicas de gravimetria e titrimetria, aplicando fundamentos de pesagem, reações ácido-base, precipitação, complexação e oxirredução na análise de substâncias de interesse farmacêutico."],"IQG241":["Teoria do Campo Cristalino, Teoria de Orbitais Moleculares Aplicada a Compostos de Coordenação, Espectro Eletrônico, Estrutura e Equilíbrio, Reações, Cinética e Mecanismos.","Capacitar o estudante a compreender os princípios de estrutura, espectroscopia, equilíbrio e reatividade de compostos de coordenação, aplicando teorias de campo cristalino e orbitais moleculares à prática farmacêutica."],"IQO242":["Segurança em laboratório químico. Vidraria: Uso, manuseio e limpeza. Solubilidade em solventes diversos. Classificação sistemática em grupos de solubilidade. Cromatografia em camada fina e em papel. Destilação simples e gracionada, à pressão normal e reduzida e por arraste de vapor. Ponto de ebulição e de fusão. Extração por partição (líquido-líquido). Filtração e agentes dessecantes. Cristalização. Literatura de química orgânica: Uso do \"Handblook\" de Química e Física.","Desenvolver habilidades práticas em técnicas laboratoriais de síntese, purificação e caracterização de compostos orgânicos, com ênfase em segurança e boas práticas de laboratório."],"FFW353":["Políticas de Medicamentos e Assistência Farmacêutica (AF); Acesso a medicamentos; Gestão e planejamento da AF na atenção básica, média e de alta complexidade. Integração com redes de atenção à saúde. Ciclo da AF; Avaliação de tecnologias e seleção de medicamentos; Relação nacional e municipal de medicamentos; Programação, aquisição e armazenamento de medicamentos; distribuição (logística territorial e cadeia de transporte; gerenciamento de resíduos - logística reversa); Sistemas de distribuição intra-hospitalar; estrutura e processo para preparo de misturas parenterais. Farmácias satélites, Padrões mínimos; Trabalho em equipes multiprofissionais (Comissões hospitalares). Educação permanente; Monitoramento e avaliação.","Compreender os princípios e práticas de gestão e planejamento da assistência farmacêutica, abrangendo políticas públicas, logística, avaliação de tecnologias e atuação em equipes multiprofissionais para garantir o acesso e a qualidade no uso de medicamentos."],"FFW351":["Aspectos históricos, conceitos gerais, tipos de toxicidade, relação dose/resposta, DL50, índice terapêutico, dentre outros parâmetros, toxicocinética e toxicodinâmica, toxicologia dos medicamentos, toxicologia dos alimentos, toxicologia social e saúde pública, toxicologia ambiental e ocupacional, toxicidade de plantas e fitoterápicos. Legislação vigente.","Compreender os princípios fundamentais da toxicologia, incluindo mecanismos de toxicidade, avaliação de risco e aspectos legais, aplicados aos medicamentos, alimentos, meio ambiente e saúde pública."],"FFW352":["Química Farmacêutica na Farmácia Clínica; Aspectos moleculares das interações medicamentosas e efeitos adversos; Aspectos moleculares da toxicidade de substâncias de interesse regulatório; Etapas Pré-Regulatórias e Processo de Aprovação de Medicamentos; Avaliação de risco humano e ambiental de fármacos, metabólitos e impurezas usando métodos alternativos. Ensaios de avaliação de toxicidade in vitro e in vivo (aguda, sub-crônica e crônica; reprodutiva; mutagenese; carcinogenese). Toxicologia in vitro e in silico integrados. Fundamentos da Toxicologia Analítica: métodos e técnicas químicas e instrumentais, testes de triagem, monitoramento de fármacos de baixo índice terapêutico; Validação em análises toxicológicas. Legislação vigente","Integrar conhecimentos de química farmacêutica e toxicologia para compreender as interações medicamentosas, avaliação de riscos, métodos analíticos e processos regulatórios relacionados à segurança e eficácia dos fármacos."],"IMW360":["São apresentadas as características gerais dos microrganismos, destacando-se a morfologia, nutrição, bioquímica, crescimento das bactérias e uso de antimicrobianos. São apresentados os métodos de isolamento e controle do crescimento bacteriano. Também são estudados os principais aspectos e mecanismos de defesa inatos e adquiridos dos seus hospedeiros.","Compreender as características dos microrganismos, métodos de controle e os mecanismos básicos de defesa imunológica, aplicados à saúde e à terapêutica farmacêutica."],"FFW355":["Apresentação das séries hematológicas. Períodos de formação intrae extra-uterinas. Célula tronco. Valores normais hematológicos. Terminologia empregada para diagnóstico das patologias e alterações hematológicas. Função de leucócitos, eritrócitos e plaquetas. Leucemias, linfomas e anemias. Estudo de grupos de fármacos que podem atuar na medula óssea e/ou no sangue periférico.","Compreender os fundamentos das séries hematológicas, suas alterações patológicas e os fármacos que atuam no sangue e medula óssea, visando a aplicação clínica e terapêutica"],"FFW361":["Estudo dos microrganismos responsáveis por doenças humanas, com foco nos processos de isolamento, identificação, mecanismos de infecção, fisiopatologia e impacto no organismo humano. Ênfase nos agentes bacterianos e virais mais relevantes no contexto sanitário brasileiro, como os responsáveis por infecções respiratórias, gastrointestinais e sistêmicas, além de doenças virais emergentes e reemergentes. Abordagem sobre a distribuição, fatores de risco e medidas de prevenção relacionadas às principais infecções bacterianas e virais, com foco em estratégias de controle e impacto no sistema de saúde pública. Estudo detalhado dos agentes antimicrobianos, incluindo quimioterápicos, antibióticos e antivirais, abordando mecanismos de ação, farmacocinética, toxicidade, resistência microbiana e aplicações clínicas. Antivirais e retrovirais utilizados no manejo de infecções virais, com destaque para estratégias inovadoras no tratamento e prevenção.","Estudar os microrganismos causadores de doenças humanas, seus mecanismos de infecção, e os agentes antimicrobianos usados no tratamento, visando a prevenção, controle e cuidado farmacêutico integrado"],"FFW363":["Classificação vegetal e nomenclatura científica. Herbários e coleções científicas. Morfoanatomia vegetal e suas aplicações na identificação de drogas farmacopeicas. Métodos de análise macro e microscópicas de matérias-primas vegetais.","Conhecer a classificação, morfoanatomia e métodos de análise de plantas para identificação e controle de qualidade de drogas vegetais farmacêuticas."],"FFW362":["Abordagem transdisciplinar, considerando aspectos da Epidemiologia, Fisiopatologia, Análises Clínicas, Farmacologia, Química Medicinal e Farmácia Clínica no contexto das principais doenças inflamatórias e imunológicas, e doenças que acometem os tratos respiratório e gastrintestinal. Fármacos com atividade antiinflamatória, antitérmica, imunossupressora, antialérgica, antiasmática, antitussígena, expectorante, descongestionante, antiulcerosa, purgativa, antidiarreica e antiemética: perfis farmacocinéticos, ações farmacológicas, mecanismos de ação, indicações terapêuticas, posologia, reações adversas, contraindicações, interações medicamentosas, e relação estrutura-atividade.","Formar o estudante para integrar conhecimentos transdisciplinares e aplicar racionalmente o uso de fármacos nas principais doenças inflamatórias, imunológicas, respiratórias e gastrintestinais, considerando suas características farmacológicas e clínicas."],"FFW364":["A disciplina visa introduzir os fundamentos e práticas da gestão aplicadas às diversas áreas de atuação do profissional farmacêutico. Serão abordados os princípios de planejamento, controle, sistemas da qualidade, ferramentas de gestão, análise de riscos, regulamentações nacionais e internacionais (ANVISA, ICH, ISO, FDA), e conceitos de inovação, liderança e transformação digital. Busca-se desenvolver habilidades técnicas e estratégicas que capacitem o farmacêutico a atuar como gestor em serviços de saúde, farmácias comunitárias e hospitalares, laboratórios e indústrias, promovendo a melhoria contínua, segurança do paciente e conformidade regulatória. Ao longo da disciplina, serão utilizados estudos de caso, oficinas práticas e atividades integrativas.","Capacitar o estudante a aplicar princípios e práticas de gestão, qualidade, regulamentação e inovação na atuação farmacêutica, promovendo a segurança, eficiência e conformidade nos diferentes setores do setor farmacêutico."],"FFW471":["Disciplina avançada projetada para capacitar os alunos com um conhecimento aprofundado sobre a fisiopatologia das doenças cardiorrenais, farmacologia clínica e terapêutica relacionada. Além disso, a disciplina foca no desenvolvimento de habilidades práticas em cuidados farmacêuticos, preparando os alunos para atender de maneira eficiente e personalizada pacientes com essas condições. Abordagem transdisciplinar, considerando aspectos da Epidemiologia, Fisiopatologia, Análises Clínicas, Farmacologia, Química Medicinal e Farmácia Clínica no contexto da saúde cardiovascular. As doenças serão selecionadas de acordo com os indicadores epidemiológicos brasileiros, atualmente: hipertensão, insuficiência cardíaca, doença renal crônica, síndrome cardiorrenal e as classes farmacológicas, de acordo com os protocolos terapêuticos vigentes. Integração funcional entre os sistemas cardiovascular e renal. Avaliação e Manejo de Pacientes com Condições Cardiorrenais. Serão abordados os fármacos simpatolíticos, vasodilatadores, bloqueadores adrenérgicos, antagonistas do sistema renina-angiotensina, bloqueadores de canais de cálcio, diuréticos e antiarrítmicos no que diz respeito a seus mecanismos de ação, efeitos farmacológicos, relação estrutura-atividade, farmacocinética, indicações terapêuticas, efeitos colaterais, interações medicamentosas e nutricionais.","Capacitar o estudante a integrar conhecimentos clínicos e farmacológicos para o manejo eficaz e personalizado de pacientes com doenças cardiorrenais, considerando aspectos fisiopatológicos, epidemiológicos e terapêuticos"],"FFW472":["Disciplina de abordagem transdisciplinar voltada ao estudo integrado da Epidemiologia, Fisiopatologia, Análises Clínicas, Farmacologia, Química Medicinal e Farmácia Clínica no contexto da saúde endócrina, metabólica e reprodutiva. Com abordagem sobre a obesidade, diabetes, distúrbios da tireoide, síndrome metabólica e caquexia, com destaque para os avanços em “sensores metabólicos” (microbiota e ciclo circadiano) e terapêuticas das disfunções da puberdade e dos sistemas reprodutores masculino e feminino, incluindo o uso de contraceptivos orais e terapias hormonais.","Capacitar o estudante a integrar conhecimentos clínicos e farmacológicos para o manejo das principais doenças endócrinas, metabólicas e reprodutivas, considerando avanços científicos e terapêuticos atuais"],"FFW473":["Introdução à Farmacognosia. Etnobotânica e Etnofarmacologia. Legislação de fitoterápicos e aspectos de controle de qualidade de drogas vegetais da Farmacopeia Brasileira. Principais classes de metabólitos secundários e drogas vegetais que as contém: antraquinonas, substâncias fenólicas, terpenoides e alcaloides. Produtos naturais ativos de origem animal, microbiana e marinha. Aspectos farmacognósticos de drogas de abuso de origem vegetal. Introdução à Fitoterapia.","Introduzir o estudante aos fundamentos da farmacognosia, incluindo etnobotânica, controle de qualidade de drogas vegetais, principais metabólitos secundários e aspectos legais e terapêuticos de produtos naturais."],"FFW481":["Disciplina de abordagem transdisciplinar, considerando aspectos da Epidemiologia, Fisiopatologia, Análises Clínicas, Farmacologia, Química Medicinal e Farmácia Clínica no contexto das principais doenças neurológicas, psiquiátricas e neurodegenerativas, bem como da dependência de drogas. Fármacos com atividade anticonvulsivante, antidepressiva, estabilizadora de humor, hipnótica, sedativa, ansiolítica, antipsicótica, anestésica e analgésica; fármacos com ação sobre as doenças neurodegenerativas; drogas de abuso: perfil farmacocinético, ações farmacológicas, mecanismos de ação, indicações terapêuticas, posologia, reações adversas, contraindicações, interações medicamentosas, relação estrutura-atividade.","Capacitar o estudante a integrar conhecimentos clínicos e farmacológicos para o manejo das principais doenças neurológicas, psiquiátricas e neurodegenerativas, incluindo o uso racional de fármacos e drogas de abuso"],"FFW482":["Estatística descritiva, variáveis e dados, medidas de tendência central e dispersão. Medidas de associação e correlação. Noções básicas probabilidade e distribuição normal. Inferência básica. Introdução ao método de pesquisa epidemiológico aplicado à pesquisa sobre o uso de medicamentos. Desenhos de estudo. Ensaios clínicos. Qualidade da evidência científica. Farmacovigilância. Estudos de utilização de medicamentos","Capacitar o estudante a aplicar métodos estatísticos e epidemiológicos na pesquisa do uso de medicamentos, avaliação de evidências científicas e farmacovigilância"],"FFW484":["Introdução à Genética, Fluxo de informação gênica, Regulação da expressão gênica, Mecanismos epigenéticos, Métodos de análise molecular de ácidos nucleicos, Biologia Molecular de Micro-organismos, Biologia molecular de plantas, Genética Clássica, Genética de Populações, Genética Humana: Doenças genéticas e Diagnóstico molecular, Farmacogenética.","Capacitar o estudante a compreender os fundamentos da genética e biologia molecular e sua aplicação na identificação de doenças, diagnóstico molecular e farmacogenética."],"FFW485":["Introdução à biotecnologia, conceitos de biologia molecular e genética aplicados à biotecnologia, caracterização estrutural de proteínas e derivados, cultivo e uso de microrganismos na indústria biotecnológica, Fundamentos de bioprocesso, recuperação e purificação de produtos biotecnológicos e produção e aplicação industrial de enzimas.","Capacitar o estudante a compreender e aplicar os fundamentos da biotecnologia na produção, purificação e uso de produtos biotecnológicos de interesse farmacêutico e industrial."],"FFW486":["Tipos de Conhecimento: Científico, Empírico, Teológico e Filosófico: suas naturezas e relações. Processos do método científico; observação, hipótese, experimentação e formulação de teorias. Indução e dedução. Análise e síntese. Juízo de Valor e Conhecimento. Investigação científica: delimitação do tema/ problema, estudos exploratórios; coleta de dados. Análise crítica na aquisição de conhecimentos. Ética e plágio na pesquisa. Transmissão dos conhecimentos adquiridos, apresentações orais e escritas. Preparação de trabalhos científicos na área das ciências farmacêuticas. Elaboração e análise crítica de projetos de pesquisa. Avaliação pelos pares.","Capacitar o estudante a compreender e aplicar os fundamentos do método científico na elaboração, análise e comunicação de projetos de pesquisa em ciências farmacêuticas."],"FFW591":["A disciplina visa estudar os protozoários, helmintos, fungos e artrópodes responsáveis por doenças humanas, concentrando-se basicamente, na caracterização morfológica, no ciclo de vida, nos processos de fisiopatologia, resposta imune, identificação diagnóstica, e em determinados casos, na epidemiologia e ecologia destes agentes. Serão enfatizadas as infecções de maior interesse no quadro sanitário brasileiro. Ademais, serão abordados os fármacos, e seus mecanismos de ação, utilizados para os tratamentos destas infecções além de discussões sobre casos clínicos. Nas aulas práticas serão ministrados métodos laboratoriais mais empregados nos laboratórios de análises clínicas, bem como os procedimentos para execução de alguns destes métodos.","Capacitar o estudante a reconhecer e compreender agentes parasitários e fúngicos de importância clínica, seus mecanismos fisiopatológicos e terapêuticos, integrando diagnóstico, tratamento e contexto epidemiológico."],"FFW592":["Atribuições e responsabilidade técnica do farmacêutico na Indústria de Alimentos. Composição e alterações químicas e bioquímicas em alimentos. Processos industriais em alimentos. Garantia da qualidade na industrialização de alimentos. Padrões de identidade e qualidade. Controle Analítico de qualidade de alimentos. Rotulagem geral e nutricional. Legislação relacionada à identidade, qualidade e rotulagem de alimentos","Capacitar o estudante para atuar na indústria de alimentos, com foco em controle de qualidade, processamento industrial, rotulagem e legislação, assegurando a identidade e segurança dos produtos alimentícios"],"IEE326":["Fundamentos básicos de Economia, com foco na aplicação de conceitos econômicos à compreensão da dinâmica da indústria farmacêutica. Transformações na indústria farmacêutica mundial e brasileira. Principais instrumentos da teoria econômica, como produção e distribuição de bens, fluxo circular de renda, sistemas de preços, crédito e moeda, indicadores macroeconômicos, comércio internacional e o balanço de pagamentos, com ênfase no contexto da economia brasileira e seus desafios ao desenvolvimento. Fundamentos da Organização Industrial, com destaque para o modelo estrutura-conduta-desempenho (ECD). Conceito de Complexo Econômico-Industrial da Saúde e papel estratégico da indústria farmacêutica e seus subsistemas produtivos. Transformações recentes da indústria farmacêutica mundial e brasileira.","Compreender os fundamentos econômicos aplicados à indústria farmacêutica, analisando sua estrutura, dinâmica e papel estratégico no Complexo Econômico-Industrial da Saúde."],"FFWK03":["Desenvolvimento de uma monografia sob orientação docente, como culminância da formação acadêmica do estudante de Farmácia. A atividade envolve a elaboração, execução e apresentação de um trabalho, baseado em pesquisa científica, estudo técnico, intervenção ou revisão sistematizada, em temas relevantes à área farmacêutica, sendo supervisionado por um profissional da Faculdade de Farmácia da UFRJ, bem como de outras unidades ou instituições, vinculadas ou não a ensino ou pesquisa, desde que tenham sido aprovados pela Comissão de TCC.","Desenvolver e apresentar um trabalho acadêmico orientado, com base em pesquisa científica, técnica ou revisão sistematizada, aplicado a temas relevantes da área farmacêutica."],"FFW501":["Estudo integrado da farmacoterapia aplicada aos principais sistemas fisiológicos e condições clínicas, incluindo dor e inflamação, distúrbios cardiovasculares e renais, respiratórios e gastrintestinais, endócrino-metabólicos, neurológicos, infecciosos e oncológicos. Análise integrada das indicações terapêuticas, mecanismos de ação, reações adversas, interações medicamentosas, farmacocinética e farmacodinâmica no contexto da prática clínica farmacêutica. Discussão sobre farmacocinética clínica, farmacogenética e interpretação de exames laboratoriais com impacto na tomada de decisão terapêutica. Aplicação de métodos e ferramentas de raciocínio clínico para a elaboração de planos de cuidado farmacêutico individualizados. Ênfase nas boas práticas em prescrição farmacêutica, comunicação clínica, escuta qualificada, intervenções e registro, com foco na atuação do farmacêutico em diferentes níveis de atenção à saúde, da atenção básica à alta complexidade.","Capacitar o estudante para aplicar o raciocínio clínico e os conhecimentos de farmacoterapia na elaboração de planos de cuidado farmacêutico individualizados, com foco na atuação profissional em diferentes níveis de atenção à saúde."],"FFW502":["Disciplina de abordagem transdisciplinar, integrando os campos da Epidemiologia, Fisiopatologia, Análises Clínicas, Farmacologia, Química Medicinal e Farmácia Clínica ao contexto das neoplasias. Visa proporcionar um embasamento teórico e prático sólido sobre os aspectos fisiopatológicos de diferentes tipos de câncer sólido, métodos diagnósticos, prognósticos, protocolos terapêuticos e estratégias clínicas de cuidado farmacêutico oncológico.","Capacitar o estudante para compreender e aplicar conhecimentos integrados no cuidado farmacêutico oncológico, com foco na fisiopatologia, diagnóstico, terapêutica e acompanhamento de neoplasias."],"FFW503":["Drogas vegetais farmacopeicas: caracterização e controle de qualidade macro e microscópico. Métodos de extração de derivados vegetais. Controle de qualidade de derivados vegetais e medicamentos fitoterápicos. Aspectos regulatórios pertinentes ao controle de qualidade de plantas medicinais e fitoterápicos.","Capacitar o estudante para identificar, caracterizar e controlar a qualidade de drogas vegetais e fitoterápicos."],"FFM010":["Conceitos de genômica, transcriptômica, proteômica, peptidômica e metabolômica. Introdução teórica e aplicações da proteômica e peptidômica na área farmacêutica. Princípios de eletroforese bidimensional, cromatografia liquida multidimensional e espectrometria de massa. Aplicações da proteômica e peptidômica na identificação de novos alvos biológicos ou proteínas e peptídeos com potencial terapêutico, assim como na identificação de biomarcadores com finalidade diagnóstica de processos patológicos.","Capacitar os alunos a aplicar técnicas para a identificação de alvos terapêuticos e biomarcadores diagnósticos, com foco na área farmacêutica."],"FFC501":["Organização de um laboratório de Bioquímica Clínica; princípios e cuidados na colheita de amostras biológicas; controle e garantia da qualidade em Bioquímica Clínica; gasometria arterial; fundamentos de urinálise; dosagens bioquímicas de glicídios, lipídeos, glicídios e proteínas de interesse clínico-laboratorial e estudos de casos.","Capacitar os alunos a organizar e operar laboratórios de Bioquímica Clínica, abordando coleta de amostras, controle de qualidade, análises bioquímicas e interpretação de resultados."],"FFC008":["A disciplina objetiva oferecer conhecimentos em citopatologia de líquidos corpóreos e cérvico vaginal, utilizados na Medicina Laboratorial das doenças que serão abordadas.","Capacitar os alunos no entendimento e na aplicação da citopatologia para diagnóstico laboratorial."],"FFC005":["Realização do hemograma, diagnóstico das anemias hemolíticas, hemoglobinapatias e talassemias. Classificação e diagnóstico laboratorial das neoplasias hematológicas. Avaliação laboratorial da Hemostasia primária e coagulação sanguínea. Através da realização das principais da rotina hematológica.","Habilitar os alunos para executar e interpretar exames hematológicos."],"FFC009":["Morfologia e biologia de fungos, classificação e taxônomia dos fungos patogênicos, mecanismo de agressão fúngica, eco-epidemiologia dos fungos e de suas doenças, micoses humanas e veterinárias, diagnóstico laboratorial das infecções fúngicas, antifúngicos e seus mecanismos de ação e resistência, testes de susceptibilidade a drogas antifúngicas, micologia de alimentos e toxinas fúngicas, controle de qualidade no laboratório de micologia médica","Estudar os fungos patogênicos, seu diagnóstico, tratamento e controle, incluindo aspectos laboratoriais e epidemiológicos."],"FFC007":["A disciplina vai estudar, de forma integrada, os principais agentes etiológicos das doenças, os mecanismos de defesa do organismo e a interação desses processos na gênese das principais doenças humanas, com ênfase no diagnóstico laboratorial das infecções de maior interesse no quadro sanitário brasileiro.","Estudar os principais agentes causadores de doenças, mecanismos de defesa do organismo e sua interação, com foco no diagnóstico laboratorial das infecções relevantes no Brasil."],"FFC004":["A disciplina compreende aulas teóricas e práticas contemplando diversas infecções parasitárias endêmicas e emergentes. Serão abordados em profundidade conceitos clínicos, diagnóstico laboratorial e também aspectos da epidemiologia, profilaxia e erradicação das doenças parasitárias. Além disso, serão abordados diversos métodos diagnósticos avançados.","Capacitar os alunos no estudo das infecções parasitárias, abordando aspectos clínicos, diagnóstico laboratorial, epidemiologia e estratégias de prevenção."],"FFC003":["Coleta e preparo de amostras para análise clínica e forense; determinação de xenobióticos e metabólicos presentes em fluídos biológicos e/ou tecidos, dentre outras amostras, utilizando técnicas cromatográficas, espectroscópicas, espectrofotométricas, imunoenzimáticas, dentre outras utilizadas no laboratório clínico; monitoramento de fármacos com baixo índice terapêutico; tópicos em boas práticas de laboratório e garantia da qualidade analítica no laboratório de análises clinicas; relevância clínica de dados toxicológicos obtidos no laboratório.","Desenvolver conhecimentos e habilidades na coleta, preparo e análise de amostras biológicas, utilizando técnicas laboratoriais para identificação e monitoramento de substâncias, enfatizando boas práticas e qualidade analítica."],"FFM009":["Introdução aos princípios da Farmacologia Clínica e da Terapêutica Racional. Farmacocinética Clínica Farmacodinâmica. Fatores de modificação de resposta aos fármacos. Interações medicamentosas. Interações medicamentos-nutrientes. Intoxicações medicamentosas agudas. Uso de medicamentos em gestantes e lactantes. Uso de medicamentos em crianças. Uso de medicamentos em idosos. Terapia hormonal na menopausa. Marcadores fisiológicos e laboratoriais dos efeitos dos medicamentos. Adesão ao tratamento. Fontes de evidências em Farmacologia Clínica.","Apresentar os conceitos básicos da farmacologia clínica, abordando o uso racional de medicamentos, fatores que influenciam a resposta terapêutica e a importância da segurança no tratamento."],"FFI005":["Alterações metabólicas no câncer, diabetes mellitus e outras patologias de cunho metabólico. Principais condutas terapêuticas. Bases moleculares para as condutas. Pesquisa e desenvolvimento de novos fármacos destinados ao tratamento das patologias.","Apresentar as alterações metabólicas em doenças como câncer e diabetes, além das abordagens terapêuticas e fundamentos para o desenvolvimento de novos medicamentos."],"FFW003":["Diabetes Mellitus e comorbidades e transmutações associadas. Classificações, aspectos epidemiológicos, etiológicos, bases moleculares, fisiopatologia, diagnóstico, prevenção e tratamento. Comorbidades, complicações.","Apresentar os principais aspectos relacionados ao Diabetes Mellitus, incluindo suas causas, diagnóstico, tratamento e complicações."],"FFM024":["Ética, bioética, conduta, legislação e normas na farmácia estética; Anatomofisiologia da pele e microbioma cutâneo; anatomia aplicada à farmácia estética, biossegurança; cosmetologia na farmácia estética, recursos estéticos manuais e com aparelhos, procedimentos pré e pós cirúrgico, Procedimentos Invasivos não cirúrgicos I (microagulhamento e preenchimentos), Procedimentos Invasivos não cirúrgicos II (toxina botulínica e fios de sustentação) Tricologia Clínica na Farmácia Estética, Micropigmentação básica e despigmentação, Farmacologia e Prescrições na Farmácia Estética (Dermocosméticos, Nutracêuticos, Nutricosméticos, Fitoterápicos).","Apresentar os fundamentos essenciais para a atuação do farmacêutico na área estética, incluindo aspectos éticos, técnicos e científicos dos principais procedimentos e recursos utilizados."],"BMF001":["Introdução à Investigação Científica em Seres Humanos. Pesquisa Clínica. Farmacocinética Clínica. Planejamento e desenvolvimento de medicamentos. Bioética em farmacologia clínica. Aspectos regulatórios e registro de medicamentos. Quantificação de fármacos em matrizes biológicas. Princípios das Boas Práticas Clínicas. Farmacologia clínica de sistemas e aparelhos.","Apresentar os conceitos básicos relacionados à pesquisa científica em humanos, desenvolvimento de medicamentos e farmacologia clínica."],"FFM012":["Farmacometria no laboratório clínico, com ênfase aos aspectos conceituais e práticos das subáreas: monitoramento terapêutico de fármacos e farmacogenômica. Aplicação de métodos bioanalíticos para avaliação da eficácia e segurança do tratamento medicamentoso. Interpretação dos testes de fármacos e genotipagem aplicadas a terapêutica individualizada.","Introduzir os conceitos e aplicações do monitoramento terapêutico de medicamentos e farmacogenômica para otimizar tratamentos clínicos."],"FFI019":["Métodos de estudos para lipídeos; Regulação do catabolismo de lipídeos; Digestão e absorção de lipídeos; Síntese e metabolismo de lipoproteínas; Metabolismo de colesterol; Metabolismo de lipídeos no tecido adiposo e fígado; regulação transcricional do metabolismo de lipídeos; Modelos de estudo do metabolismo de lipídeos; epidemia de obesidade e suas consequências.","Apresentar os principais aspectos do metabolismo dos lipídeos, suas vias regulatórias e implicações clínicas, incluindo a relação com a obesidade."],"FFP002":["Livro de registro do receituário de aplicação de injetáveis; Aspectos legais para a administração de injetáveis; Aspectos anatômicos; Vias de administração de medicamentos; Apresentação de injetávreis; Escolha da seringa e da agulha para administração de injeções intramusculares; Técnica de preparo e administração de injetáveis: de medicamento líquido, de medicamento liofilizado (em pó); aspectos de biossegurança (equipamentos de proteção individual e coletiva); Acidentes e complicações mais prevalentes.","Apresentar os conceitos básicos e procedimentos relacionados à administração segura de medicamentos injetáveis, incluindo aspectos legais, técnicos e de biossegurança."],"FFP001":["Introducao e historico dos primeiros socorros. Funcoes e sinais vitais. Hemorragias. Asfixia. Parada cardio-pulmonar. Traumatismos. Feridas. Queimaduras. Corpos estranhos. Afogamentos. Envenenamentos. Convulsoes. Alcoolismo. Emergencias clinicas","Apresentar os conceitos fundamentais dos primeiros socorros, incluindo o reconhecimento e atendimento inicial de diversas emergências clínicas e traumáticas."],"FFP015":["Plantas medicinais, Fitoterápicos e Fitoterapia: princípios e aplicações. Segurança e eficácia terapêutica. Sistemas Terapêuticos com Plantas Medicinais. Pesquisa bibliográfica em plantas medicinais. Etnobotânica. prescrição Fitoterápica. Plantas que atuam nos diversos sistemas: digestivo, circulatório, nervoso, urinário, respiratório e cardiovascular. Plantas que atuam no metabolismo. Plantas com atividades imunomoduladora e adaptógena, antiviral e antitumoral, etc.","Introduzir os conceitos básicos sobre plantas medicinais e fitoterapia, abordando suas aplicações terapêuticas, segurança e eficácia."],"FFP007":["Biomas brasileiros e diversidade vegetal. Revisão histórica do uso de recursos vegetais nativos e introdução de espécies exóticas. Extrativismo e cultivo de espécies vegetais com valor econômico. Impacto de sistemas agrícolas e extrativistas e conservação da natureza. Plantas produtoras de fibras e madeira. Plantas forrageiras e de uso alimentar. Plantas tóxicas. Plantas de uso medicinal, condimentar e aromático. Plantas de uso ritualístico e alucinógeno.","Apresentar a diversidade vegetal dos biomas brasileiros e os diferentes usos das plantas, incluindo aspectos econômicos, culturais e ambientais."],"FFM413":["História da Homepatia e Farmácia Homeopática no Brasil; Introdução ao Organon; Escalas Homeopáticas para preparação de formas farmacêuticas centesimal, decimal e cinqüenta milesimal; Métodos: Korsakov e Fluxo Contínuo; Os sintomas Homeopáticas.","Introduzir os conceitos básicos e métodos relacionados à farmácia homeopática."]};

// =====================================================================
// Seção: farmacia-regras
// =====================================================================
/* FarmacIA – regras oficiais da UFRJ (Manual Estudantil da UFRJ e PPC de Farmácia).
   Só texto estático conferido nos dois documentos; não depende dos dados de disciplinas.
   Uso: FarmaRegras.match(textoNormalizado) -> { id, html, chips } ou null. */
(function () {
  'use strict';

  var MANUAL = 'Manual Estudantil da UFRJ';
  var PPC = 'PPC de Farmácia';
  function p(s) { return '<p>' + s + '</p>'; }
  function fonte(s) { return '<p class="farma-source">Fonte: ' + s + '</p>'; }
  function ul(items) { return '<p>' + items.map(function (i) { return '• ' + i; }).join('<br>') + '</p>'; }
  var CONFIRME = 'Regras podem mudar: confirme na Secretaria Acadêmica ou com o seu orientador.';

  var T = {
    coordenacao: {
      re: /coordenacao|coordenador|coordenadora|direcao adjunta|diretora adjunta|diretor adjunto|direcao de graduacao|\b(milene|sodero|botelho|raissa|naomi|eline)\b|ana carolina renno|thiago botelho/,
      html: p('<strong>Coordenação do curso de Farmácia</strong> (atendimento presencial no Prédio do CCS, Bloco K, Sala 15):') +
        ul(['<strong>Turno Integral:</strong> não há mais plantão. Procure primeiro o seu <strong>professor orientador</strong>. Se ele não resolver, ele mesmo aciona a coordenação, que marca um encontro presencial se for preciso. E-mail: ffcoordenacao.integral@gmail.com', '<strong>Turno Noturno:</strong> quartas-feiras, das 14h30 às 18h. E-mail: ffcoordenacao.noturno@gmail.com']) +
        p('<strong>Quem é quem</strong>') +
        ul(['Integral: Profª Milene Rangel da Costa (coordenadora) e Profª Ana Carolina Rennó Sodero (substituta)', 'Noturno: Prof. Thiago Botelho Azeredo (coordenador) e Profª Raissa Alves da Conceição (substituta)', 'Direção Adjunta de Graduação: Profª Maria Eline Matheus e Profª Naomi Kato Simas']) +
        fonte('Página da Coordenação de Graduação da Faculdade de Farmácia/UFRJ. ' + CONFIRME),
      chips: [{ label: 'Secretaria de Graduação', q: 'Como funciona o atendimento da secretaria?' }, { label: 'Professor orientador', q: 'O que faz o professor orientador?' }]
    },
    secretaria: {
      re: /secretaria|registro de diploma|diploma(?! de honra)|processos? sei|\bsei\b|equipe da secretaria/,
      html: p('<strong>Secretaria de Graduação da Faculdade de Farmácia</strong>. A recomendação é priorizar o atendimento online, para evitar deslocamentos desnecessários.') +
        p('<strong>E-mails, conforme a demanda</strong>') +
        ul(['secretariaffufrj@gmail.com: documentação, informações gerais e dúvidas', 'procgradffufrj@gmail.com: abertura e acompanhamento de processos SEI', 'diplomaffufrj@gmail.com: registro de diploma e acompanhamento dos processos']) +
        p('<strong>Atendimento presencial:</strong> de segunda a quinta, das 10h às 20h. Sexta-feira é trabalho interno.') +
        p('<strong>Onde fica:</strong> Av. Carlos Chagas Filho, 373, Prédio do CCS, Bloco K, Sala 13, Cidade Universitária, Rio de Janeiro, CEP 21941-902.') +
        p('<strong>Equipe:</strong> André Gomes, Halana Maia, Jacqueline Abreu, Martinho Neto e Rafael Amaral.') +
        fonte('Página da Secretaria de Graduação da Faculdade de Farmácia/UFRJ. ' + CONFIRME),
      chips: [{ label: 'Coordenação', q: 'Como falo com a coordenação?' }, { label: 'Como funciona a inscrição', q: 'Como funciona a inscrição em disciplinas?' }]
    },
    atendimento: {
      re: /atendimento|plantao|horario de funcionamento|ate que horas|esta aberta/,
      html: p('Tenho o atendimento de dois lugares:') +
        ul(['<strong>Secretaria de Graduação</strong> (CCS, Bloco K, Sala 13): segunda a quinta, 10h às 20h; sexta é trabalho interno. Prefira o e-mail secretariaffufrj@gmail.com.', '<strong>Coordenação, turno Noturno</strong> (CCS, Bloco K, Sala 15): quartas, 14h30 às 18h. No <strong>Integral</strong> não há plantão: fale primeiro com o seu professor orientador.']) +
        fonte('Páginas da Coordenação e da Secretaria de Graduação da Faculdade de Farmácia/UFRJ. ' + CONFIRME),
      chips: [{ label: 'Coordenação', q: 'Como falo com a coordenação?' }, { label: 'Secretaria', q: 'Como funciona a secretaria?' }]
    },
    situacaoSiga: {
      re: /letra [a-z]\b|codigos? (de )?situacao|situacao (do )?(pedido|protocolo)|significa.*situacao|\binscricao normal\b|lotacao esgotada|falta de requisito|menos de 6 creditos|mais de 32 creditos|previsao pendente|turma desativada|transferido de turma|disciplina ja cursada|inscricao trancada/,
      html: p('No protocolo de pedidos (CRPID) aparece uma letra na coluna “Situação”. A maioria são <strong>avisos</strong>: não significam que o pedido não foi enviado e <strong>não interferem na disputa por vaga</strong>, mas precisam ser resolvidos para o professor poder lançar a sua nota.') +
        ul(['<strong>A, Inscrição normal:</strong> tudo certo.', '<strong>L, Lotação esgotada:</strong> naquele momento já havia gente com mais prioridade que o número de vagas. Não é definitivo: só o CRID decide.', '<strong>F, Falta de requisito:</strong> pré-requisito não cursado (ou ainda não lançado), ou co-requisito que não está no pedido.', '<strong>P, Um terço fora do curso:</strong> limite de disciplinas de fora do seu currículo.', '<strong>M, Horário sobreposto:</strong> duas disciplinas no mesmo horário.', '<strong>O, Menos de 6 créditos</strong> e <strong>H, Mais de 32 créditos:</strong> fora da carga permitida, salvo autorização especial da Unidade.', '<strong>J e K, Matrícula cancelada ou trancada:</strong> procure a secretaria para regularizar.', '<strong>C, Inscrição trancada</strong> (você trancou uma disciplina em que já tinha vaga), <strong>G, Disciplina já cursada</strong>, <strong>D, Transferido de turma</strong> e <strong>Q, Turma desativada</strong>.', '<strong>Previsão pendente:</strong> falta dado na turma (professor ou local); a secretaria resolve.']) +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ).'),
      chips: [{ label: 'Pedido não é inscrição', q: 'Qual a diferença entre pedido e inscrição?' }, { label: 'O que é a CRID?', q: 'O que é a CRID?' }]
    },
    crid: {
      example: "Se você pediu 6 disciplinas e a CRID mostra 5, a sexta não foi alocada: você não está inscrito nela.",
      re: /\bcrid\b|comprovante de inscricao|crpid|cripd|protocolo de (envio|pedido)/,
      html: p('A <strong>CRID</strong> (Confirmação de Registro de Inscrições em Disciplinas) é o <strong>único documento que comprova a sua inscrição</strong>. Se a disciplina consta nela, você está na turma; se não consta, não conseguiu a vaga.') +
        p('Salve a CRID nas datas do calendário acadêmico, e confira se todas as inscrições estão como “inscrição normal”. Inscrição irregular impede o lançamento de notas.') +
        p('Já a <strong>CRPID/CRIPD</strong> é só o protocolo dos pedidos enviados: mostra o que você solicitou, não garante vaga e não serve como comprovante.') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ) e cartilha da Comissão de Orientação Acadêmica da Faculdade de Farmácia.'),
      chips: [{ label: 'Letras de situação', q: 'O que significam as letras de situação do pedido?' }, { label: 'Critérios de vaga', q: 'Quais os critérios de prioridade das vagas?' }]
    },
    pedidoInscricao: {
      example: "Você pede uma turma e o SIGA avisa “inscrição normal”. Dias depois, alguém com mais prioridade pede a mesma turma e o aviso vira “lotação esgotada”. Só a CRID gerada no fim do prazo diz se você ficou com a vaga.",
      re: /pedido (de )?inscricao|pedido e inscricao|pedido nao e inscricao|diferenca entre pedido|como (fazer|faco|funciona|e) (a |o )?(inscricao|pedido)|inscricao em disciplinas?|inscricoes em disciplinas|me inscrever|me inscrevo|periodo de (pedidos|inscricao)|danca das cadeiras|concordancia de pedidos?|siga.*(inscricao|pedido)/,
      html: p('<strong>Pedido não é inscrição.</strong> No período de pedidos, o SIGA só recolhe solicitações; quem ganha a vaga só é definido quando termina o prazo e a <strong>CRID</strong> é gerada.') +
        ul(['Caminho: SIGA > Serviços > Inscrição > Pedido > Pedido de inscrição em disciplinas. Depois de adicionar as turmas, clique em <strong>Enviar</strong>.', 'Os e-mails do SIGA (“inscrição normal”, “lotação esgotada”, “realocado”) mostram só a situação do pedido naquele instante. Eles mudam até o fechamento.', 'Na <strong>concordância</strong>, o coordenador libera (ou não) pedidos de alunos de outros cursos. “Concordado” não é vaga garantida.', 'Se o pedido oscilar numa turma lotada, você pode desistir (X) e pedir outra turma, dentro do prazo.', 'Quem fica o período sem nenhuma inscrição tem a matrícula trancada automaticamente; se repetir no semestre seguinte, vira cancelamento definitivo.']) +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ).'),
      chips: [{ label: 'Critérios de vaga', q: 'Quais os critérios de prioridade das vagas?' }, { label: 'O que é a CRID?', q: 'O que é a CRID?' }, { label: 'Trocar de turma', q: 'Como trocar de turma?' }]
    },
    vagas: {
      example: "Dois alunos pedem a mesma turma: leva a vaga primeiro o aluno do curso; se os dois são do curso, quem está no período recomendado da disciplina; depois valem os critérios da coordenação (COA, CRA, turno).",
      re: /criterios? (de )?(classificacao|prioridade|alocacao|desempate)|quem tem prioridade|prioridade (na|nas|em|de) (vaga|vagas|turma|turmas|inscricao)|como (as )?vagas (sao )?(distribuidas|alocadas|escolhidas)|ordem de prioridade|nao consegui (a )?vaga|sem vaga|vagas? ociosas?|vaga garantida|garantia de vaga|outro turno|disciplina de outro periodo|\bcoa\b|\bcra\b.*(vaga|prioridade)/,
      html: p('O SIGA ordena os pedidos assim:') +
        ul(['<strong>1º, localização:</strong> alunos do curso para o qual a turma é oferecida; depois da mesma unidade, do mesmo centro e, por fim, do resto da UFRJ.', '<strong>2º, periodização:</strong> quem está no período recomendado da disciplina. Se ela é eletiva ou você está fora do período, quem tem o período mais alto passa na frente.', '<strong>Depois, critérios que a coordenação define:</strong> COA (créditos acumulados), CRA e turno.', 'Pedidos já <strong>concordados</strong> têm prioridade, e quem garantiu vaga na fase de pedidos não a perde para pedidos da fase de alteração (AID).']) +
        p('Na Faculdade de Farmácia, o aluno tem vaga garantida no seu <strong>turno e período</strong>. Disciplinas de outro turno ou período dependem de vaga. Se não conseguir, procure uma turma menos concorrida ou curse no próximo semestre. Não fique na sala sem a disciplina estar na CRID: a nota não pode ser lançada depois.') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ) e cartilha da Comissão de Orientação Acadêmica da FF.'),
      chips: [{ label: 'Pedido não é inscrição', q: 'Qual a diferença entre pedido e inscrição?' }, { label: 'Trocar de turma', q: 'Como trocar de turma?' }]
    },
    trocaTurma: {
      example: "Você está inscrito na turma A e pede transferência para a B. Se a B não tiver vaga, você fica sem nenhuma das duas.",
      re: /(trocar|mudar|transferir|transferencia) (de |da |a )?turma|\baid\b|alteracao de inscricao|inscricao direta|prazo de alteracao|incluir (e|ou) excluir disciplina|\bcoaa\b|calouro.*(inscricao|disciplina)/,
      html: p('No <strong>prazo de alteração (AID)</strong> você pode incluir e excluir disciplinas e transferir de uma turma para outra. A transferência depende de <strong>vaga na turma de destino</strong>. Se não houver, você <strong>não volta automaticamente</strong> para a turma anterior e fica sem a vaga.') +
        p('A <strong>inscrição direta</strong> é feita <strong>somente</strong> para calouros e alunos em acompanhamento do COAA. Os demais fazem pedidos pelo SIGA.') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ) e página de informações da Secretaria de Graduação da FF.'),
      chips: [{ label: 'Critérios de vaga', q: 'Quais os critérios de prioridade das vagas?' }, { label: 'Horário sobreposto', q: 'E se duas disciplinas tiverem o mesmo horário?' }]
    },
    sobreposicao: {
      example: "Duas disciplinas às segundas, das 8h às 10h: as duas inscrições ficam irregulares e você perde a vaga nas duas.",
      re: /horario sobreposto|sobreposicao|conflito de horario|choque de horario|mesmo horario|duas disciplinas (no|em) (o )?mesm|dois horarios|colid/,
      html: p('Você <strong>não pode</strong> se inscrever em duas disciplinas com horários sobrepostos. Quem faz isso fica <strong>irregular e perde a inscrição nas duas</strong>. No protocolo aparece a letra <strong>M</strong>.') +
        p('Antes de enviar o pedido, confira os horários das turmas no site da Graduação da Faculdade de Farmácia (Integral ou Noturno).') +
        fonte('Página de informações da Secretaria de Graduação da FF e Manual de Inscrição em Disciplinas (SIGA/UFRJ).'),
      chips: [{ label: 'Letras de situação', q: 'O que significam as letras de situação do pedido?' }]
    },
    concomitancia: {
      example: "Quem termina o curso neste semestre pode pedir para cursar uma disciplina junto com o seu pré-requisito. Quem ainda tem vários períodos pela frente, não.",
      re: /concomitan|quebra de pre ?requisito|quebrar pre ?requisito|puxar sem (o )?pre ?requisito|sem (ter )?(cumprido|cursado|feito) (o )?pre ?requisito|aluno concluinte|\bconcluinte\b|sem o requisito/,
      html: p('O pedido de <strong>concomitância de disciplinas / quebra de pré-requisito é somente para o aluno concluinte</strong>, isto é, quem tem condições de concluir o curso no semestre corrente. O pedido é analisado pela <strong>coordenação do curso</strong>.') +
        p('Para os demais alunos, a inscrição em disciplina com requisito faltando é irregular. Os concluintes também ficam isentos do limite de créditos por período (mínimo 6 e máximo 32).') +
        fonte('Página de informações da Secretaria de Graduação da FF e cartilha da Comissão de Orientação Acadêmica da FF.'),
      chips: [{ label: 'Coordenação', q: 'Como falo com a coordenação?' }, { label: 'Pré-requisitos', q: 'Qual a diferença entre pré e co-requisito?' }]
    },
    umTerco: {
      example: "Com 6 disciplinas no semestre, no máximo 2 podem ser de fora do seu currículo.",
      re: /um terco|\b1\/3\b|terco (do|dos) (credito|disciplina)|resolucao ceg 0?3|(maximo|limite) (de )?(disciplinas|creditos) (de |em )?(fora|outro)/,
      html: p('Você <strong>não pode cursar mais de 1/3 dos créditos fora do seu curso</strong> no semestre (Resolução CEG 03/75). Se passar, o pedido recebe a letra <strong>P</strong> no protocolo.') +
        p('Além disso, o pedido para disciplinas de outros cursos passa pela concordância da coordenação daquele curso, e a prioridade na vaga é dos alunos do próprio curso.') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ) e cartilha da Comissão de Orientação Acadêmica da FF.'),
      chips: [{ label: 'Disciplina de outro curso', q: 'Posso cursar disciplina de outro curso?' }, { label: 'Critérios de vaga', q: 'Quais os critérios de prioridade das vagas?' }]
    },
    trancAuto: {
      example: "Se você não pedir nenhuma disciplina neste semestre, a matrícula é trancada sozinha; se acontecer de novo no semestre seguinte, ela é cancelada.",
      re: /trancamento automatico|sem (fazer |ter )?(pedido|inscricao|inscricoes)|nao (fiz|fazer|faco|fizer) (a |o )?(inscricao|pedido)|ficar sem inscricao|esqueci (de )?(me )?inscrever/,
      html: p('Quem <strong>não faz pedido de inscrição</strong> e fica o período sem nenhuma disciplina tem a matrícula <strong>trancada automaticamente</strong>. Se a situação se repetir no semestre seguinte, o trancamento automático vira <strong>cancelamento definitivo</strong>, irrevogável (Resolução CEG 03/2008, art. 6º).') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ).'),
      chips: [{ label: 'Trancar a matrícula', q: 'Como trancar a matrícula?' }, { label: 'Cancelamento', q: 'Quando a matrícula é cancelada?' }]
    },
    agf: {
      re: /\bagf\b|alteracao de grau|assistir aula sem (estar )?inscrit|ficar na sala sem|fazer (a )?(disciplina|materia) sem (estar )?inscri|minha nota nao (foi )?lancad|nota nao lancada|nao lancaram (a )?(minha )?nota/,
      html: p('Quem assiste a uma disciplina <strong>sem ela constar na CRID</strong> não consegue ter a nota lançada: a Alteração de Grau e Frequência (AGF) <strong>não pode mais ser usada para “inscrever” alguém</strong>, só para corrigir nota ou frequência de quem já está na pauta.') +
        p('Se você não conseguiu a vaga, procure uma turma menos concorrida ou curse a disciplina no próximo semestre. Também vale lembrar que inscrição irregular impede o lançamento da nota.') +
        fonte('Manual de Inscrição em Disciplinas (SIGA/UFRJ), sobre o Memo Circular 057/2009 da PR1.'),
      chips: [{ label: 'O que é a CRID?', q: 'O que é a CRID?' }]
    },
    orientador: {
      re: /orientador|orientadora|orientacao academica|\bcpo\b|comissao de orientacao|corpo de professores orientadores|meus alunos orientados/,
      html: p('Todo aluno tem um <strong>professor orientador</strong> (Corpo de Professores Orientadores, CPO). Ele ajuda a entender os procedimentos acadêmicos, a montar o <strong>plano de estudos</strong> e a acompanhar o seu desempenho, para evitar retenção, evasão e cancelamento por insuficiência de rendimento (Resolução CEG 10/2004).') +
        ul(['Deve oferecer ao menos <strong>1 hora presencial a cada 15 dias</strong> de atendimento.', 'Analisa o seu boletim/BOA no fim do período e orienta as escolhas, inclusive as disciplinas de escolha condicionada.', 'Pode emitir parecer sobre o seu desempenho e orientar quem recebe auxílio estudantil.', 'No turno Integral, é a <strong>primeira pessoa a procurar</strong> antes da coordenação.']) +
        p('O orientador <strong>não monta o plano por você</strong> e <strong>não garante vaga</strong> em disciplina: o objetivo é estimular a sua autonomia.') +
        fonte('Cartilha “Orientações aos Professores (Orientadores Acadêmicos)”, Comissão de Orientação e Acompanhamento Acadêmico da Faculdade de Farmácia.'),
      chips: [{ label: 'Plano de estudos', q: 'Como montar o plano de estudos?' }, { label: 'O que é o BOA?', q: 'O que é o BOA?' }]
    },
    planoEstudos: {
      re: /plano de estudos?|dicas? (de|para) (montar|o) (plano|periodo)|reduzir (o )?numero de disciplinas|comecando o curso|dificuldade no inicio|reprovei|reprovacao|fluxograma/,
      html: p('Dicas da cartilha de orientação da Faculdade de Farmácia para montar o plano de estudos:') +
        ul(['Acompanhe o <strong>fluxograma</strong> do curso e lembre que, além das obrigatórias, você precisa de optativas/eletivas, livre escolha e horas de extensão.', 'Com dificuldade no início, <strong>reduza o número de disciplinas</strong> nos primeiros períodos e priorize as básicas e as que são pré-requisito.', 'Disciplinas com muitos créditos pesam mais no CR.', 'Considere pré-requisitos, horários e a concorrência por vaga (represamento).', 'Se está difícil acompanhar uma disciplina, é melhor <strong>trancar dentro do prazo</strong> do calendário do que abandonar.', 'Salve a CRID com as inscrições regulares todo período.']) +
        p('Se quiser, posso sugerir uma grade (“monte meu próximo período”) com base no que você já marcou.') +
        fonte('Cartilha “Orientações aos Professores (Orientadores Acadêmicos)” da Faculdade de Farmácia/UFRJ.'),
      chips: [{ label: 'Monte meu próximo período', q: 'Monte meu próximo período' }, { label: 'Trancar disciplina', q: 'Como trancar uma disciplina?' }]
    },
    boa: {
      re: /boletim de orientacao|o que (e|eh) (o )?boa\b|\bboa\b (do aluno|serve|significa|tem)|para que serve (o )?boa|\bboletim nao oficial\b/,
      html: p('O <strong>BOA</strong> (Boletim de Orientação Acadêmica) é o documento mais completo sobre a sua vida acadêmica, com 9 páginas:') +
        ul(['Páginas 1 e 2: disciplinas obrigatórias para integralizar.', 'Páginas 3 a 5: disciplinas eletivas.', 'Página 6: estágios complementares e disciplinas de livre escolha.', 'Páginas 7 e 8: resumo da trajetória e dos créditos que faltam para concluir o curso.']) +
        p('No SIGA: Serviços > Boletim/Histórico/CRID. Ele também é usado pelo professor orientador.') +
        fonte('Cartilha “Orientações aos Professores (Orientadores Acadêmicos)” da Faculdade de Farmácia/UFRJ.'),
      chips: [{ label: 'Professor orientador', q: 'O que faz o professor orientador?' }, { label: 'O que é a CRID?', q: 'O que é a CRID?' }]
    },
    cafar: {
      re: /cafar|centro academico|\bca\b (da |de )?farmacia|assembleia geral|eleicao(es)? (do |da |de )?(ca|cafar|centro)|representacao estudantil|representante estudantil|jalecos?|aluguel de|emprestimo de livro/,
      html: p('O <strong>CAFar</strong> (Centro Acadêmico de Farmácia da UFRJ) é o órgão máximo representativo dos alunos de graduação da Faculdade de Farmácia. Fica no <strong>Bloco L do CCS</strong> (sede legal: Av. Carlos Chagas Filho, 373).') +
        ul(['Todo aluno de graduação com matrícula ativa pode votar e opinar na <strong>Assembleia Geral</strong>, a instância máxima. Ela precisa ser convocada com pelo menos 7 dias de antecedência.', 'A <strong>Diretoria Executiva</strong> tem presidente, vice, tesoureiro, diretor geral e cinco diretorias: comunicação, infraestrutura, eventos, produtos e políticas estudantis. O mandato é de <strong>1 ano</strong>.', 'As eleições acontecem no <strong>segundo semestre</strong>, com voto direto e secreto, e o voto é facultativo para os estudantes.', 'A diretoria de <strong>infraestrutura</strong> administra o aluguel de jalecos, óculos e calculadoras, o empréstimo de livros e a venda de materiais de laboratório.', 'A de <strong>políticas estudantis</strong> faz a ponte entre alunos e professores e divulga bolsas, editais e estágios. A de <strong>eventos</strong> organiza a Semana da Farmácia.', 'Dois membros representam os alunos na Congregação da Faculdade.']) +
        fonte('Estatuto do CAFar-UFRJ (novembro de 2025).'),
      chips: [{ label: 'Bolsas e monitoria', q: 'Como funcionam as bolsas?' }, { label: 'Coordenação', q: 'Como falo com a coordenação?' }]
    },
    documentos: {
      re: /historico (escolar)?|boletim|carteira (de )?(estudante|estudantil)|declaracao de (matricula|aluno|vinculo)|comprovante de matricula|declaracao (que )?(sou|estou)|portal do aluno|portalaluno/,
      html: p('Onde pedir cada documento, segundo o Manual Estudantil:') +
        ul(['<strong>Histórico escolar oficial</strong>, <strong>boletim escolar</strong>, <strong>BOA</strong> e <strong>carteira de estudante</strong>: Secretaria Acadêmica da Unidade (no seu caso, a Secretaria de Graduação da Faculdade de Farmácia).', '<strong>Histórico não oficial</strong>, <strong>CRID</strong> e <strong>declaração de matrícula ativa</strong>: direto no Portal do Aluno (portalaluno.ufrj.br).']) +
        fonte(MANUAL + ', “Solicitação de Documentos”.'),
      chips: [{ label: 'Secretaria de Graduação', q: 'Como funciona o atendimento da secretaria?' }, { label: 'O que é a CRID?', q: 'O que é a CRID?' }]
    },
    biblioteca: {
      re: /bibliotec|\bsibi\b|livros? (da )?(ufrj|faculdade)|emprestimo de livros?|acervo|base minerva/,
      html: p('As bibliotecas da UFRJ fazem parte do <strong>SiBI</strong> (Sistema de Bibliotecas e Informações), que gerencia as <strong>45 bibliotecas</strong> da universidade. Pelo site (sibi.ufrj.br) dá para consultar o catálogo e reservar livros online (Base Minerva), além de acessar livros e periódicos eletrônicos.') +
        p('Além disso, o CAFar empresta livros e aluga jalecos, óculos e calculadoras aos alunos da Farmácia.') +
        fonte(MANUAL + ', seção sobre o SiBI, e Estatuto do CAFar.'),
      chips: [{ label: 'Sobre o CAFar', q: 'Como funciona o CAFar?' }]
    },
    mobilidade: {
      re: /mobilidade|intercambio|estudar fora|ciencia sem fronteiras|escala estudantil|\bsmile\b|\bsgri\b|programa internacional|estudar no exterior/,
      html: p('A UFRJ oferece mobilidade internacional por meio de programas como a <strong>Mobilidade Regular</strong>, o <strong>ESCALA-Estudantil AUGM</strong>, o <strong>SMILE/Rede Magalhães</strong> e o <strong>REARI-RJ/Utrecht</strong>, entre outros. Quem cuida dos acordos é a Superintendência de Relações Internacionais (SGRI).') +
        p('Também existe o Programa de Mobilidade Acadêmica entre universidades. Regras e prazos mudam a cada edital: acompanhe os editais e fale com a coordenação do curso.') +
        fonte(MANUAL + ', seções sobre a SGRI e sobre os programas da Pró-Reitoria.'),
      chips: [{ label: 'Coordenação', q: 'Como falo com a coordenação?' }]
    },
    mudancaCurso: {
      re: /mudanca de curso|mudar de curso|trocar de curso|transferencia (de curso|externa|especial|facultativa)|transferir (de )?(universidade|faculdade)|reingresso|mudanca de campus/,
      html: p('Mudança de curso, transferência externa (especial e facultativa), mudança de campus e reingresso são processos da <strong>Divisão de Acesso aos Cursos de Graduação da Pró-Reitoria de Graduação (PR-1)</strong>, que publica os editais e informa os prazos.') +
        p('Para a transferência da UFRJ para outra universidade, quem define as regras é a universidade de destino.') +
        fonte(MANUAL + ', “Divisões da PR1” e “Transferências”. ' + CONFIRME),
      chips: [{ label: 'Outro curso na UFRJ', q: 'Posso cursar disciplina de outro curso?' }]
    },
    calendario: {
      re: /calendario (academico|da ufrj|de atos)|datas (do )?(semestre|periodo)|quando (comecam|terminam|sao) (as )?(aulas|inscricoes|pedidos|trancamento)|inicio das aulas|fim do semestre|prazo (de|do|para) (trancamento|inscricao|pedido|alteracao)/,
      html: p('Não guardo as datas, porque elas mudam a cada semestre. O <strong>calendário acadêmico</strong> (inscrição, alteração, trancamento, início e fim das aulas) é definido pelo CEG e fica no site da Graduação da PR-1 (<strong>graduacao.ufrj.br</strong>) e no site da Graduação da Faculdade de Farmácia (<strong>graduacao.farmacia.ufrj.br</strong>).') +
        p('Vale conferir as datas todo semestre: perder o prazo de pedidos pode deixar a matrícula trancada automaticamente.') +
        fonte('Cartilha da Comissão de Orientação Acadêmica da FF e Manual de Inscrição em Disciplinas (SIGA/UFRJ).'),
      chips: [{ label: 'Trancamento automático', q: 'O que acontece se eu não fizer pedido de inscrição?' }]
    },
    semFonte: {
      re: /revisao de (nota|prova|grau)|rever (a )?(nota|prova)|segunda chamada|prova (de )?segunda|prova final|exame final|recuperacao|recurso (da|de|contra) (nota|prova)|nota errada|lista de espera|plano de ensino|criterio de avaliacao|edital de (monitoria|bolsa|selecao)/,
      html: p('Reconheci o assunto, mas <strong>não tenho a regra oficial sobre isso</strong> nos documentos que consulto (Manual Estudantil, PPC, cartilhas e informações da Secretaria). Prefiro não inventar.') +
        ul(['Sobre <strong>notas, provas, segunda chamada e plano de ensino</strong>: fale primeiro com o professor da disciplina e, se precisar, com o departamento ou a coordenação do curso.', 'Sobre <strong>vaga</strong>: no SIGA existem os pedidos, que concorrem pelos critérios de prioridade, e a alteração de inscrição para turmas com vagas ociosas. Não encontrei “lista de espera” nos documentos.', 'Sobre <strong>editais</strong>: acompanhe a divulgação do CAFar, da coordenação e da PR-1.']) +
        p('O que está no Manual sobre <strong>nota mínima e frequência</strong> eu sei explicar.'),
      chips: [{ label: 'Nota mínima e frequência', q: 'Qual a nota mínima e a frequência?' }, { label: 'Coordenação', q: 'Como falo com a coordenação?' }]
    },
    frequencia: {
      example: "Numa disciplina de 60 h, os 75% de presença significam que você pode faltar, no máximo, 15 h (cerca de um quarto das aulas).",
      re: /frequencia|quantas faltas|(limite|maximo) de faltas|posso faltar|\babono\b|reprov\w* por falta/,
      html: p('Para ser aprovado, você precisa de <strong>grau final ≥ 5</strong> <em>e</em> de <strong>frequência mínima de 75%</strong> das aulas. Quem não atinge os 75% é reprovado, mesmo com nota alta.') +
        p('Não existe abono de faltas na graduação, exceto nos casos previstos em lei (reservistas convocados e representantes na CONAES). Para quem não pode ir às aulas por doença, há os <strong>exercícios domiciliares</strong>, mediante atestado e autorização.') +
        fonte(MANUAL + ', “Avaliação de Rendimento” e “Frequência”.'),
      chips: [{ label: 'Exercícios domiciliares', q: 'Como funcionam os exercícios domiciliares?' }, { label: 'Como é calculado o CR?', q: 'Como é calculado o CR?' }]
    },
    nota: {
      example: "Grau final 4,9 reprova; 5,0 aprova, desde que a frequência seja de pelo menos 75%.",
      re: /nota minima|media (pra|para) (passar|aprovar)|nota (pra|para) (passar|aprovar)|quanto (preciso |eu preciso )?tirar|grau (minimo|final)|como (sou|e) aprovad/,
      html: p('A nota vai de 0 a 10, arredondada para uma casa decimal. Para ser aprovado e ganhar os créditos da disciplina, o <strong>grau final precisa ser ≥ 5,0</strong> e a frequência ≥ 75%.') +
        p('Quem reprova por média ou por frequência repete a disciplina inteira, e isso pesa no CRA.') + fonte(MANUAL + ', “Graus e Frequência”.'),
      chips: [{ label: 'Frequência mínima', q: 'Qual a frequência mínima?' }, { label: 'Como é calculado o CR?', q: 'Como é calculado o CR?' }]
    },
    cr: {
      re: /(como|qual).*(calcul\w*).*(cr|cra|coeficiente)|o que (e|eh) (o )?(cr|cra)\b|coeficiente de rendimento|\bcra\b.*(significa|calcula)|\bcr\b.*(significa|calcula)/,
      html: p('O <strong>CR</strong> (por período) e o <strong>CRA</strong> (acumulado) são a <strong>média ponderada das notas finais</strong>, tendo como peso o número de créditos de cada disciplina.') +
        p('Ele conta para bolsas e estágios. Disciplinas dispensadas (conceito T) não entram no cálculo.') + fonte(MANUAL + ', “Cálculo do Coeficiente de Rendimento”.'),
      chips: [{ label: 'Requisitos de bolsas', q: 'Quais os requisitos das bolsas?' }, { label: 'Dignidade Acadêmica', q: 'O que é Dignidade Acadêmica?' }]
    },
    trancDisc: {
      re: /tranc(ar|o|ei|amento) (uma |a |de |da )?(disciplina|materia|inscricao)|desist\w* d\w* (uma )?(disciplina|materia)|trancamento de (disciplina|inscricao)|largar (a |uma )?(disciplina|materia)/,
      html: p('Você pode desistir de uma inscrição em disciplina <strong>com autorização do professor orientador</strong>, desde que <strong>ainda não tenha passado 1/4 do período letivo</strong>.') +
        p('Atenção: depois de trancar, você não pode ficar com <strong>menos de 6 créditos</strong> inscritos no período.') + fonte(MANUAL + ', “Trancamento de Inscrição”.'),
      chips: [{ label: 'Limite de créditos', q: 'Qual o limite de créditos no SIGA?' }, { label: 'Trancar a matrícula', q: 'Como trancar a matrícula?' }]
    },
    trancMat: {
      re: /tranc(ar|o|ei|amento) (a |o |minha )?(matricula|curso|faculdade)|trancamento de matricula|destranc/,
      html: p('O trancamento de matrícula pode ser pedido na Unidade <strong>a qualquer época, exceto na última metade do período letivo</strong>. Quem autoriza é o Diretor da Unidade, com parecer do orientador ou da COAA.') +
        ul(['A matrícula só pode ficar trancada por <strong>no máximo 4 períodos</strong> (seguidos ou não).', 'Quem entrou por concurso só tem pleno direito ao trancamento depois de cursar, com aprovação, <strong>12 créditos ou 180 horas-aula</strong> na UFRJ.', 'Se não pedir o retorno no prazo, a matrícula é cancelada por abandono.', 'Quem não se inscreve em disciplinas no prazo tem a matrícula <strong>trancada automaticamente</strong>.']) +
        fonte(MANUAL + ', “Trancamento de Matrícula” e “Trancamento Automático”.'),
      chips: [{ label: 'Cancelamento de matrícula', q: 'Quando a matrícula é cancelada?' }, { label: 'Prazo máximo do curso', q: 'Qual o prazo máximo para me formar?' }]
    },
    cancelamento: {
      re: /cancel\w* (de |da |a )?matricula|matricula (e |eh |foi |pode ser |sera )?cancelad|jubil|perder a matricula|ser desligad|desligamento|abandono de curso/,
      html: p('A matrícula pode ser cancelada quando o aluno:') +
        ul(['não se inscreve em disciplinas em um período letivo (abandono);', 'tem <strong>CR abaixo de 3,0 em três períodos regulares consecutivos</strong>;', 'ultrapassa o <strong>prazo máximo</strong> de integralização;', 'reprova <strong>quatro vezes na mesma disciplina</strong>;', 'sofre sanção disciplinar.']) +
        p('Para evitar, mantenha as inscrições em dia e acompanhe o rendimento e o prazo.') + fonte(MANUAL + ', “Cancelamento de Matrícula”.'),
      chips: [{ label: 'Prazo máximo do curso', q: 'Qual o prazo máximo para me formar?' }, { label: 'Trancar a matrícula', q: 'Como trancar a matrícula?' }]
    },
    prazoMax: {
      re: /prazo maximo|tempo maximo|quanto tempo (eu )?(tenho|posso)|em quantos periodos|duracao do curso|quantos anos (tem|dura|leva)|prazo (pra|para) (me )?formar|integralizacao/,
      html: p('O prazo máximo é o prazo normal do curso <strong>multiplicado por 1,5</strong>. A Farmácia tem 5 anos (10 períodos) de duração normal, então o limite é de <strong>15 períodos (7 anos e meio)</strong>.') +
        p('Períodos em que a matrícula esteve cancelada por abandono também contam. Pedidos de prorrogação passam pela Coordenação.') +
        fonte(MANUAL + ', “Prazo Máximo para Integralização Curricular” (a conta de 15 períodos é a aplicação da regra aos 10 períodos do ' + PPC + ').'),
      chips: [{ label: 'Carga horária do curso', q: 'Qual a carga horária total do curso?' }, { label: 'Cancelamento de matrícula', q: 'Quando a matrícula é cancelada?' }]
    },
    cargaHoraria: {
      re: /carga horaria (total|do curso|da farmacia)|quantas horas (tem|tem o|e o|sao) (o )?curso|horas (totais|do curso)|\b4150\b|\b4\.?150\b/,
      html: p('O curso de Farmácia tem <strong>4.150 horas</strong> no total:') +
        ul(['Disciplinas obrigatórias: <strong>2.610 h</strong>', 'Estágios curriculares: <strong>840 h</strong>', 'Extensão: <strong>415 h</strong>', 'Optativas de escolha condicionada: <strong>180 h</strong>', 'Atividades complementares: <strong>60 h</strong>', 'TCC: <strong>45 h</strong>']) +
        fonte(PPC + ', Tabela 1.'),
      chips: [{ label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam?' }, { label: 'Extensão', q: 'Como funciona a extensão?' }, { label: 'Atividades complementares', q: 'O que são atividades complementares?' }]
    },
    extensao: {
      re: /extensao|\b415\b|horas de extensao/,
      html: p('São <strong>415 horas de extensão</strong>, e a Atividade Curricular de Extensão fica disponível durante <strong>todo o período</strong> do curso, não só no 1º semestre.') +
        p('Valem ações registradas no SIGA de outras Unidades, de outras instituições (que sigam as diretrizes de extensão), de empresas juniores e de ligas acadêmicas com docente tutor. Não pode ser cumprida só com cursos e eventos.') +
        fonte(PPC + ', seção de Extensão.'),
      chips: [{ label: 'Carga horária do curso', q: 'Qual a carga horária total do curso?' }, { label: 'Atividades complementares', q: 'O que são atividades complementares?' }]
    },
    complementares: {
      re: /atividades? complementares?|\bacs?\b (conta|valem|horas)|horas complementares/,
      html: p('Você precisa de <strong>60 horas</strong> de atividades complementares, em <strong>no mínimo duas modalidades diferentes</strong>.') +
        ul(['Contam monitorias, estágios não obrigatórios, iniciação científica, extensão, eventos, cursos, ligas acadêmicas e estudos em áreas afins.', 'Cada atividade dura no mínimo <strong>3 semanas</strong> (20 h semanais), vale no máximo <strong>45 h por modalidade</strong> e pode levar até 2 períodos.', 'Depois do relatório aprovado, a atividade é registrada no SIGA.']) +
        fonte(PPC + ', “Atividades Complementares”.'),
      chips: [{ label: 'Extensão', q: 'Como funciona a extensão?' }, { label: 'Requisitos de bolsas', q: 'Quais os requisitos das bolsas?' }]
    },
    tcc: {
      re: /(regras?|como funciona|o que (e|eh)|quantas horas|orientador|defesa|banca|pre ?requisito).*\btcc\b|\btcc\b.*(regras|orientador|defesa|banca|como funciona|horas|individual)|trabalho de conclusao de curso|monografia/,
      html: p('O <strong>TCC</strong> vale <strong>45 horas</strong> e é obrigatório para a colação de grau. É <strong>individual</strong>, sobre ciências farmacêuticas, com orientador aceito pela Comissão de TCC.') +
        p('Ele é um requisito curricular (FFWK02), oferecido no <strong>9º período</strong> do integral e no 11º do noturno, e exige antes o requisito de Pesquisa e Desenvolvimento / Iniciação Científica (FFWX02). Relatório de IC não vale como TCC, mas a IC pode virar monografia.') +
        fonte(PPC + ', Anexo II (Manual de TCC).'),
      chips: [{ label: 'Carga horária do curso', q: 'Qual a carga horária total do curso?' }, { label: 'Atividades complementares', q: 'O que são atividades complementares?' }]
    },
    dignidade: {
      re: /dignidade academica|cum laude|summa|magna|laude|diploma de honra/,
      html: p('A <strong>Dignidade Acadêmica</strong> vai para quem conclui com <strong>CRA acima de 8 em todos os períodos</strong>, dentro do tempo normal do curso e sem sanção disciplinar.') +
        ul(['<strong>Cum Laude</strong>: CRA ≥ 8,0', '<strong>Magna Cum Laude</strong>: CRA ≥ 9,0', '<strong>Summa Cum Laude</strong>: CRA ≥ 9,5']) +
        p('O pedido é feito na Divisão de Registro de Estudante (DRE), em qualquer época do ano.') + fonte(MANUAL + ', “Dignidade Acadêmica”.'),
      chips: [{ label: 'Como é calculado o CR?', q: 'Como é calculado o CR?' }, { label: 'Prazo máximo do curso', q: 'Qual o prazo máximo para me formar?' }]
    },
    bolsas: {
      re: /bolsas?\b|monitoria|pibiac|requisitos? (de|das|pra|para) bolsas?|iniciacao artistica/,
      html: p('Requisitos de algumas bolsas de graduação (os editais anuais podem acrescentar regras):') +
        ul(['<strong>Monitoria</strong>: nota ≥ 7 na disciplina, CRA ≥ 6, sem sanção disciplinar; 8 a 12 h semanais, por até 10 meses.', '<strong>PIBIAC</strong> (artístico-cultural): a partir do 3º período, CRA ≥ 6; 8 a 12 h semanais, de 3 a 12 meses.', '<strong>PAEALIG</strong> (laboratórios de informática): CRA ≥ 6 e sem sanção; 8 a 12 h semanais, por até 12 meses.']) +
        p('Não é permitido acumular bolsas acadêmicas; só com bolsa de natureza assistencial (auxílio ou auxílio manutenção).') + fonte(MANUAL + ', “Bolsa Monitoria”, “PIBIAC” e “PAEALIG”.'),
      chips: [{ label: 'Como é calculado o CR?', q: 'Como é calculado o CR?' }, { label: 'Atividades complementares', q: 'O que são atividades complementares?' }]
    },
    outroCurso: {
      re: /(outro|outros) curso|fora do curriculo|disciplinas? (de|do) outro|cursar (em|no) outro|materia de outro/,
      html: p('Dá para cursar disciplinas de outros cursos da UFRJ se houver <strong>vaga, requisitos cumpridos, horário compatível e aceitação do Departamento</strong>.') +
        p('As disciplinas fora do seu currículo não podem passar de <strong>1/3</strong> das disciplinas em que você está inscrito, e os créditos delas não podem superar os créditos das disciplinas do seu currículo. Vale sempre o limite de <strong>6 a 32 créditos</strong> por período.') +
        fonte(MANUAL + ', seção sobre inscrição em disciplinas.'),
      chips: [{ label: 'Limite de créditos', q: 'Qual o limite de créditos no SIGA?' }, { label: 'Dispensa de disciplina', q: 'Como pedir dispensa de disciplina?' }]
    },
    dispensa: {
      re: /dispens\w* (de |da |d[ea] )?(disciplina|materia)|dispensa\b|equivalencia|aproveitamento de estudos|aproveit\w* (de )?(disciplina|materia|credito)|cursei em outra (faculdade|instituicao|universidade)|credito transferido/,
      html: p('Você pode pedir dispensa de uma disciplina que <strong>cursou em outra instituição antes de ingressar na UFRJ</strong>, se o conteúdo for equivalente. O pedido vai à Secretaria Acadêmica da Unidade e uma comissão compara programa, carga horária, data e aprovação (Resolução CEG nº 01/2017).') +
        p('A disciplina entra no histórico com o conceito <strong>T</strong> (crédito transferido) e <strong>não entra no CR</strong>.') + fonte(MANUAL + ', “Dispensa de Disciplinas”.'),
      chips: [{ label: 'Cursar em outro curso', q: 'Posso cursar disciplina de outro curso?' }]
    },
    notaI: {
      re: /nota i\b|grau i\b|conceito i\b|incompleto|\bi\b.*(historico|boletim)/,
      html: p('O grau <strong>“I”</strong> (incompleto) pode ser dado pelo professor quando, por motivo justificado, você não conseguiu cumprir todos os atos acadêmicos.') +
        p('Ele precisa ser trocado por uma nota em até <strong>15 dias</strong>. Passado o prazo, a DRE lança <strong>zero</strong> como nota final. Por isso, fale com o professor logo.') + fonte(MANUAL + ', “Cuidado com a nota I”.'),
      chips: [{ label: 'Nota mínima', q: 'Qual a nota mínima para passar?' }]
    },
    domiciliar: {
      re: /exercicios? domiciliares?|regime domiciliar|atestado medico|licenca (medica|maternidade)|estou doente|afastamento/,
      html: p('Quem não pode frequentar as aulas por um tempo pode pedir <strong>exercícios domiciliares</strong>, com atestado médico. Não é abono de faltas: você faz os trabalhos em casa, sob supervisão do professor, dentro do prazo do atestado.') +
        p('A concessão não é automática, e <strong>aulas práticas de laboratório e estágios não entram</strong>. Nesses casos, o indicado é o <strong>trancamento de matrícula</strong>.') + fonte(MANUAL + ', “Tratamentos Excepcionais”.'),
      chips: [{ label: 'Trancar a matrícula', q: 'Como trancar a matrícula?' }, { label: 'Frequência mínima', q: 'Qual a frequência mínima?' }]
    },
    credito: {
      example: "Uma disciplina teórica de 4 créditos tem 60 h por semestre (4 × 15). Uma prática de 2 créditos também tem 60 h (2 × 30).",
      re: /\bo que (e|eh|sao) (um |o |os )?creditos?\b|\b(um|1) credito (equivale|vale|e|tem)\b|\bcredito equivale\b|quanto vale (um|1) credito|quantas horas (tem|vale|e) (um|1) credito|como (se )?calcula (o )?credito/,
      html: p('Na UFRJ, <strong>1 crédito equivale a 15 horas de aula teórica ou a 30 horas de aula prática</strong> por semestre. Nas disciplinas mistas, as atividades de extensão e pesquisa contam como horas teóricas.') +
        p('Já nos requisitos curriculares suplementares (RCS), 1 crédito corresponde a algo entre 45 e 90 horas, definido pelo Departamento responsável.') + fonte(MANUAL + ', seção sobre o cálculo do crédito.'),
      chips: [{ label: 'Limite de créditos', q: 'Qual o limite de créditos no SIGA?' }, { label: 'Carga horária do curso', q: 'Qual a carga horária total do curso?' }]
    },
    ru: {
      re: /\bru\b|bandej|restaurante universitario|cardapio|onde (comer|almocar)|almoco/,
      html: p('Pelo Manual Estudantil, os restaurantes universitários da UFRJ ficam em:') +
        ul(['<strong>RU Central</strong> (Edson Luís de Lima Souto), ao lado da EEFD, Av. Carlos Chagas Filho, s/n · (21) 3938-6840', '<strong>RU do CT</strong>, Av. Athos da Silveira Ramos, 149, entrada principal do Bloco A', '<strong>RU da Faculdade de Letras</strong>, Av. Horácio Macedo, 2151, Bloco G · (21) 3938-9737', 'Outros: IFCS (Centro), Praia Vermelha e Duque de Caxias']) +
        p('Ainda <strong>não consigo mostrar o cardápio do dia</strong>: o manual não traz isso e eu não acesso a internet.') + fonte(MANUAL + ', “Alimentação”.'),
      chips: []
    }
  };

  var ORDER = ['documentos', 'biblioteca', 'mobilidade', 'mudancaCurso', 'calendario', 'coordenacao', 'secretaria', 'situacaoSiga', 'crid', 'umTerco', 'trancAuto', 'agf', 'concomitancia', 'trocaTurma', 'pedidoInscricao', 'vagas', 'sobreposicao', 'boa', 'cafar', 'planoEstudos', 'credito', 'trancDisc', 'trancMat', 'cancelamento', 'prazoMax', 'cargaHoraria', 'complementares', 'extensao', 'tcc', 'orientador', 'dignidade', 'bolsas', 'outroCurso', 'dispensa', 'notaI', 'domiciliar', 'frequencia', 'nota', 'cr', 'ru', 'semFonte', 'atendimento'];

  function match(n) {
    for (var i = 0; i < ORDER.length; i++) {
      var t = T[ORDER[i]];
      if (t.re.test(n)) return { id: ORDER[i], html: t.html, chips: t.chips, example: t.example || '' };
    }
    return null;
  }

  window.FarmaRegras = { match: match, ids: ORDER.slice(), all: function () { return ORDER.map(function (id) { return { id: id, html: T[id].html, chips: T[id].chips }; }); } };
})();

// =====================================================================
// Seção: farmacia-assistente
// =====================================================================
/* FarmacIA — assistente de perguntas sobre a grade.
 * NÃO usa IA generativa nem rede: interpreta a pergunta com regras simples e responde
 * com a lógica que o app já tem (checkReqs, getPrereqLockedSubjects, rankDisciplineSearch...).
 * Carregado depois de app.js; usa suas funções globais. Todo o texto das respostas é gerado
 * aqui, em português (o contêiner das mensagens tem data-no-i18n). */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (v) { return escapeHTML(String(v == null ? '' : v)); };

  // ---------- utilidades ----------
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  var ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];
  function plural(n, one, many) { return n === 1 ? one : many; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function listNames(arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
  }
  function periodLabel(m) { return periodIsCond(m.periodo) ? 'Escolha condicionada' : m.periodo + 'º período'; }
  function statusOf(m) { return getSubjectStatus(m); }
  var STATUS_TEXT = { passed: 'cursada', eligible: 'disponível', blocked: 'bloqueada' };

  function bold(m) { return '<strong>' + esc(formatName(m)) + '</strong>'; }
  function codeTag(m) { return '<span class="subject-code">' + esc(m.codigo) + '</span>'; }

  function rowHTML(m, extra) {
    var st = statusOf(m);
    var meta = codeTag(m) + ' · ' + esc(periodLabel(m)) + ' · ' + esc(creditsOf(m)) + ' créd.' + (extra ? ' · ' + esc(extra) : '');
    return '<button type="button" class="farma-row" data-farma-ask="Sobre ' + esc(m.codigo) + '" data-farma-label="Sobre ' + esc(formatName(m)) + '">' +
      '<span class="farma-dot is-' + st + '" aria-hidden="true"></span>' +
      '<span class="farma-row-main"><strong>' + esc(formatName(m)) + '</strong><small>' + meta + ' · ' + STATUS_TEXT[st] + '</small></span></button>';
  }
  function rowsHTML(list, max) {
    var shown = max ? list.slice(0, max) : list;
    lastListed = shown.slice();
    var html = '<div class="farma-rows">' + shown.map(function (m) { return rowHTML(m); }).join('') + '</div>';
    if (max && list.length > max) html += '<p class="farma-note">…e mais ' + (list.length - max) + '.</p>';
    return html;
  }
  function p(html) { return '<p>' + html + '</p>'; }
  function ul(items) { return '<p>' + items.map(function (i) { return '• ' + i; }).join('<br>') + '</p>'; }
  function verdict(kind, text) { return '<span class="farma-verdict is-' + kind + '">' + esc(text) + '</span>'; }

  // ---------- requisitos ----------
  // Replica checkReqs, mas devolvendo o que falta. Com "OU", mostra o grupo mais próximo de ser cumprido.
  function missingOf(m) {
    if (!m.pre) return { missing: [], alternatives: false };
    var groups = m.pre.replace(/;/g, ' E ').split(/\s+OU\s+/i).map(function (g) { return g.trim(); }).filter(Boolean);
    var best = null;
    groups.forEach(function (g) {
      var miss = extractCodes(g).filter(function (c) { return !appState.concludedCodes.has(c); });
      if (best === null || miss.length < best.length) best = miss;
    });
    return { missing: (best || []).map(getDisciplinaByCode).filter(Boolean), alternatives: groups.length > 1 };
  }
  function prereqList(m) { return extractCodes(m.pre).map(getDisciplinaByCode).filter(Boolean); }
  function coreqDirect(m) { return extractCodes(m.co).map(getDisciplinaByCode).filter(Boolean); }

  // ---------- reconhecimento da disciplina na pergunta ----------
  var STOP = ('posso puxar pegar cursar fazer consigo consegue da dá pra para pro pode podem ja já ' +
    'tranca trancam trancar trava libera destrava destrancar liberada liberado liberadas liberados ' +
    'pre requisito requisitos prerequisito prerequisitos co correquisito correquisitos ' +
    'qual quais que quem quanto quantos quantas tem tenho tenha creditos credito carga horaria horas hora ' +
    'materia materias disciplina disciplinas me minha meu sobre informacoes informacao info detalhes ' +
    'falta faltam preciso precisa precisar necessario junto com ao mesmo tempo ' +
    'eh e o a os as de do da dos das no na nos nas um uma uns umas em ' +
    'por favor voce vc diga fale explique explica mostra mostre ver quero queria saber ' +
    'esta estao estou to ficou fica seria sao ser periodo proximo atual agora hoje tudo bem ' +
    'oi ola opa eae salve hey hello bom boa dia tarde noite obrigado obrigada valeu ' +
    'condicionada condicionadas optativa optativas eletiva eletivas obrigatoria obrigatorias ' +
    'nao nem pq porque por gostaria poderia mim alguma algum assim entao mas so apenas vou ficar sera ainda cursando cursei juntas juntos ambas ambos tambem codigo tipo carga quantas quantos horas').split(' ');
  var STOP_SET = {};
  STOP.forEach(function (w) { STOP_SET[w] = true; });

  // ---- siglas: CIF I..VII, PCQ I..VII, MACF, QFIIT... (gerado a partir dos nomes + alguns apelidos) ----
  var aliasMap = null;
  function buildAliases() {
    aliasMap = {};
    disciplinas.forEach(function (d) {
      var m;
      if ((m = /^Cuidado Integrado em Farm[aá]cia ([IVX]+)\b/.exec(d.nome))) aliasMap['cif ' + m[1].toLowerCase()] = d.codigo;
      if ((m = /^Produ[cç][aã]o e Controle de Qualidade (?:de Produtos Farmac[eê]uticos|em Farm[aá]cia) ([IVX]+)\b/.exec(d.nome))) {
        aliasMap['pcq ' + m[1].toLowerCase()] = d.codigo;
        aliasMap['pcqf ' + m[1].toLowerCase()] = d.codigo;
      }
      var par = /\(([A-Za-z ]{2,12})\)/.exec(d.nome);
      if (par) aliasMap[norm(par[1])] = d.codigo;
    });
    [['qfiit', 'FFW352'], ['qfm i', 'FFW242'], ['qfm ii', 'FFW352'], ['tcc', 'FFWK03'], ['libras', 'LEB599']].forEach(function (a) {
      if (getDisciplinaByCode(a[1])) aliasMap[a[0]] = a[1];
    });
  }
  function aliasSubject(text) {
    if (!aliasMap) buildAliases();
    // "cif4" -> "cif 4"; "cif 4" -> "cif iv"
    var n = norm(text).replace(/([a-z])(\d)/g, '$1 $2');
    n = n.replace(/\b(cif|pcqf|pcq|qfm)\s+([1-8])\b/g, function (_, a, d) { return a + ' ' + ROMAN[Number(d)]; });
    var keys = Object.keys(aliasMap).sort(function (x, y) { return y.length - x.length; });
    for (var i = 0; i < keys.length; i += 1) {
      if ((' ' + n + ' ').indexOf(' ' + keys[i] + ' ') >= 0) return getDisciplinaByCode(aliasMap[keys[i]]);
    }
    return null;
  }

  function codesIn(text) {
    var out = [];
    norm(text).split(' ').forEach(function (tok) {
      if (tok.length === 6 || tok.length === 4) {
        var m = getDisciplinaByCode(tok.toUpperCase());
        if (m && out.indexOf(m) < 0) out.push(m);
      }
    });
    return out;
  }

  function stripIntent(text) {
    return norm(text).split(' ').filter(function (t) { return t && !STOP_SET[t] && !/^\d{1,2}$/.test(t); });
  }

  // O ranking da busca é tolerante demais para uma pergunta ("dia" casa com Diabetes). Aqui exigimos
  // que cada palavra da pergunta apareça no nome da disciplina (ou seja um erro de digitação claro).
  function validatesAgainst(mat, tokens, score) {
    var hay = norm(formatName(mat) + ' ' + mat.nome);
    return tokens.every(function (t) {
      if (t.length < 3) return true;
      if (hay.indexOf(t) >= 0) return true;
      return t.length >= 6 && score >= 700;
    });
  }

  // Fallback: acha a disciplina pelas palavras do nome mesmo quando a frase tem outras palavras ("quais matérias dependem de Cálculo para Farmácia").
  var NAME_INDEX_STOP = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, para: 1, em: 1, na: 1, no: 1, com: 1, a: 1, o: 1, as: 1, os: 1, ff: 1, ao: 1, aos: 1, as_: 1 };
  var nameIdx = null;
  function buildNameIdx() {
    nameIdx = { df: {}, list: [] };
    (typeof disciplinas !== 'undefined' ? disciplinas : []).forEach(function (d) {
      var seen = {}, ws = [];
      norm(formatName(d) + ' ' + d.nome).split(' ').forEach(function (w) { if (w && w.length >= 3 && !NAME_INDEX_STOP[w] && !seen[w]) { seen[w] = 1; ws.push(w); } });
      ws.forEach(function (w) { nameIdx.df[w] = (nameIdx.df[w] || 0) + 1; });
      nameIdx.list.push({ mat: d, words: ws });
    });
  }
  function wordMatch(q, w) {
    if (q === w) return true;
    if (q.length >= 5 && w.length >= 5 && (w.indexOf(q) === 0 || (w.length >= 7 && q.indexOf(w) === 0))) return true;
    if (q.length >= 6 && w.length >= 6 && editDistance(q, w) <= 1) return true;
    return q.length >= 9 && w.length >= 9 && editDistance(q, w) <= 2;
  }
  function findByWords(text) {
    if (!nameIdx) buildNameIdx();
    var qs = norm(text).replace(/([a-z])(\d)/g, '$1 $2').split(' ').filter(function (t) { return t.length >= 3; });
    if (!qs.length) return { list: [], ambiguous: false };
    var romanQ = (/\b(i|ii|iii|iv|v|vi|vii)\b/.exec(norm(text)) || [])[1] || (function () { var m = /\b[a-z]{4,} ([1-8])\b/.exec(norm(text)); return m ? ROMAN[Number(m[1])].toLowerCase() : ''; })();
    var res = [];
    nameIdx.list.forEach(function (e) {
      var tot = 0, got = 0, rare = false;
      e.words.forEach(function (w) {
        var wt = 1 / nameIdx.df[w]; tot += wt;
        for (var i = 0; i < qs.length; i += 1) {
          if (wordMatch(qs[i], w)) { got += wt; if (nameIdx.df[w] <= 2 && w.length >= 6) rare = true; break; }
        }
      });
      if (!got) return;
      var cover = got / tot;
      if (cover >= 0.6 || (rare && got >= 0.5)) {
        var bonus = 0;
        if (romanQ && new RegExp('\\b' + romanQ + '\\b').test(norm(e.mat.nome))) bonus = 0.25;
        res.push({ mat: e.mat, score: got * (0.5 + cover) + bonus });
      }
    });
    if (!res.length) return { list: [], ambiguous: false };
    res.sort(function (a, b) { return b.score - a.score; });
    var close = res.filter(function (r) { return r.score >= res[0].score * 0.9; }).slice(0, 5);
    if (close.length === 1) return { list: [close[0].mat], ambiguous: false };
    return { list: close.map(function (r) { return r.mat; }), ambiguous: true };
  }

  var MIN_SCORE = 520;
  function findSubjects(text) {
    var byCode = codesIn(text);
    if (byCode.length) return { list: byCode, ambiguous: false };
    var al = aliasSubject(text);
    if (al) return { list: [al], ambiguous: false };

    var tokens = stripIntent(norm(text).replace(/\b([a-z]{4,}) ([1-8])\b(?! (periodo|semestre|creditos|credito|horas))/g, function (_, w, d) { return w + ' ' + ROMAN[Number(d)]; }));
    if (!tokens.length) return { list: [], ambiguous: false };
    var best = rankDisciplineSearch(tokens.join(' '));
    if (!best.length || best[0].score < MIN_SCORE) return findByWords(text);
    best = best.filter(function (r) { return validatesAgainst(r.mat, tokens, r.score); });
    if (!best.length) return findByWords(text);
    var top = best[0].score;
    var close = best.filter(function (r) { return r.score >= top * 0.93; }).slice(0, 5);
    if (close.length === 1) return { list: [best[0].mat], ambiguous: false };
    return { list: close.map(function (r) { return r.mat; }), ambiguous: true };
  }

  // ---------- tolerância a erros de digitação ----------
  // Abreviações de chat e letras repetidas viram palavras comuns; palavras quase iguais às que o
  // assistente conhece ("poso", "pre-requizito", "trancmento") são corrigidas só para entender a intenção.
  // O reconhecimento de disciplinas continua usando a busca do app, que já é tolerante.
  var ABBR = { oq: 'o que', vc: 'voce', vcs: 'voces', pd: 'pode', pq: 'por que', q: 'que', qq: 'que', tb: 'tambem', tbm: 'tambem',
    qto: 'quanto', qtos: 'quantos', qts: 'quantos', qtas: 'quantas', qdo: 'quando', kd: 'cade', td: 'tudo', msm: 'mesmo',
    pfv: 'por favor', pf: 'por favor', obg: 'obrigado', vlw: 'valeu', blz: 'beleza', flw: 'falou', n: 'nao', ta: 'esta',
    to: 'estou', mt: 'muito', d: 'de', p: 'para', c: 'com', sla: 'sei la', mi: 'me', pra: 'pra', dps: 'depois', hj: 'hoje', cmg: 'comigo',
    oi: 'oi', ola: 'ola', eae: 'eae', bjs: 'beijos', ss: 'sim', sdds: 'saudades', ctz: 'certeza', agr: 'agora', vdd: 'verdade' };
  var VOCAB = ('posso puxar pegar cursar fazer consigo consegue pode podem liberada liberado disponivel disponiveis ' +
    'requisito requisitos prerequisito prerequisitos correquisito correquisitos tranca trancam trancar trancamento destrancar ' +
    'trava libera destrava depende dependem matricula inscricao creditos credito faltam falta restam quantos quantas quanto ' +
    'periodo periodos disciplina disciplinas materia materias obrigatorias obrigatoria condicionadas condicionada optativas eletivas ' +
    'frequencia faltas presenca reprovar reprovado aprovado aprovacao nota bolsa bolsas monitoria extensao complementares atividades ' +
    'carga horaria horario horarios horas prazo maximo maxima minimo minima cancelamento cancelar cancelada dignidade academica calculado calculo coeficiente ' +
    'dispensa dispensar domiciliares atestado cardapio bandejao restaurante ajuda ajudar funciona progresso siga limite ' +
    'informacoes informacao detalhes sobre nome chamar chama chame ola voce pode sabe faz fazer ' +
    'responder funcoes semestre integralizacao formar formatura curso sugestao sugere quais qual quem quando como porque ' +
    'periodo proximo agora hoje dia tarde noite proxima entendeu entender fala saber coisa duvida pergunta perguntar perdido perdida preocupado preocupada atrasado atrasada conseguir reprovei reprovado passei bombei explicar explica detalhes resumir simples entendi confuso confusa errado errada pedido pedidos turma vaga tudo bem tranque tranquei trancada abandono jubilamento monografia orientador orientadora banca ementa reprovar passar aprovar compara comparar compensa destrava libera exemplo simples resumo detalha historico declaracao biblioteca intercambio mobilidade calendario coordenacao coordenador coordenadora secretaria atendimento concomitancia concluinte crid crpid pedido pedidos turma turmas vaga vagas prioridade sobreposto sobreposicao conflito diploma boletim cafar centro academico assembleia jaleco eleicao eleicoes plantao diretora direcao inscrever inscricoes alteracao').split(' ');
  var VOCAB_SET = {};
  VOCAB.forEach(function (w) { VOCAB_SET[w] = true; });

  function editDistance(a, b) { // Damerau-Levenshtein (trocas de letras vizinhas contam 1)
    var al = a.length, bl = b.length, i, j, d = [];
    for (i = 0; i <= al; i += 1) { d[i] = [i]; }
    for (j = 0; j <= bl; j += 1) { d[0][j] = j; }
    for (i = 1; i <= al; i += 1) {
      for (j = 1; j <= bl; j += 1) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[al][bl];
  }
  function snapWord(t) {
    if (VOCAB_SET[t] || t.length < 4 || /\d/.test(t)) return t;
    var limit = t.length >= 8 ? 2 : 1, best = null, bestD = 99, tie = false;
    for (var i = 0; i < VOCAB.length; i += 1) {
      var v = VOCAB[i];
      if (v.charAt(0) !== t.charAt(0) || Math.abs(v.length - t.length) > limit) continue;
      var dist = editDistance(t, v);
      if (dist > limit) continue;
      if (dist < bestD) { best = v; bestD = dist; tie = false; } else if (dist === bestD && v !== best) tie = true;
    }
    return best && !tie ? best : t;
  }
  function fuzzyNorm(raw) {
    var out = [];
    norm(raw).replace(/(.)\1{2,}/g, '$1$1').split(' ').forEach(function (t) {
      if (!t) return;
      if (ABBR[t] !== undefined) { out.push(ABBR[t]); return; }
      out.push(snapWord(t));
    });
    return out.join(' ');
  }

  // ---------- intenções ----------
  var lastSubject = null;
  var lastIntentId = null;
  var ctx = { id: null, subject: null, listed: [], res: null, rule: null };
  var lastListed = null;

  function has(n, re) { return re.test(n); }
  function words(n) { return n ? n.split(' ').length : 0; }

  // Várias disciplinas numa pergunta: "posso puxar CIF I e Farmacocinética juntas?"
  function findMany(text) {
    var parts = String(text).split(/\s*(?:,|;|\be\b|\bcom\b|\bmais\b|\bmas\b|\bou\b)\s*/i).filter(Boolean);
    var out = [];
    parts.forEach(function (part) {
      var f = findSubjects(fuzzyNorm(part));
      if (f.list.length === 1 && out.indexOf(f.list[0]) < 0) out.push(f.list[0]);
    });
    return out;
  }
  function numberIn(n) {
    var m = /\b(\d{1,2})\b/.exec(n);
    return m ? Number(m[1]) : null;
  }

  function classify(raw) {
    var n = fuzzyNorm(raw);
    if (!n) return { id: 'empty' };
    var nw = words(n);
    var entityHint = codesIn(raw).length > 0 || !!aliasSubject(raw);

    // 1) Conversa
    if (!entityHint && has(n, /\bquem (e|eh) (voce|a farmacia)\b/)) return { id: 'who' };
    if (!entityHint && nw <= 5 && has(n, /\b(tudo bem|td bem|como (voce )?(vai|esta|ta|anda)|como foi o dia)\b/)) return { id: 'howare' };
    if (!entityHint && nw <= 5 && has(n, /^(oi+e*|oie+|oioi|ola|opa|eae|e ai|salve|hey|hello|hi|ei|fala( ai)?|chat|farmacia|assistente|bom dia|boa tarde|boa noite|boa madrugada)( |$)/)) return { id: 'greet', part: /bom dia|boa tarde|boa noite/.exec(n) };
    if (nw <= 6 && has(n, /\b(obrigad[oa]|obrigadao|brigad[oa]|brigadao|brigadinha|obgd|valeu|thanks|agradeco|grat[oa])\b/)) return { id: 'thanks' };
    if (nw <= 7 && !entityHint && has(n, /\b(tchau|ate mais|ate logo|ate amanha|ate depois|ate a proxima|falou|fui nessa|vou nessa|xau|flw|tmj|tenho que ir|era so isso|por enquanto e so|depois (eu )?volto|depois te chamo|se cuida|fica bem|fui)\b/)) return { id: 'bye', tmj: /\btmj\b/.test(n) };
    if (nw <= 3 && has(n, /^(ok|okay|beleza|certo|entendi|entendido|show|legal|massa|top|perfeito|otimo|combinado|sim|nao|talvez|hum|aham|uhum|boa)$/)) return { id: 'ack', word: n };
    if (nw <= 8 && !entityHint && has(n, /\b(inteligente|incrivel|genial|gostei|amei|adorei|mandou bem|parabens|voce e (muito )?(boa|legal|util|top)|ajudou)\b/)) return { id: 'praise' };
    if (nw <= 12 && !entityHint && has(n, /\b(burra|burro|idiota|inutil|lixo|pessima|pessimo|nao entende|nao entendeu|nao serve|nao era isso|nao foi isso|entendeu errado|errou|resposta (errada|ruim)|que droga|nao ajuda|nao ajudou|ta errado|esta errado|nao funciona|deu erro|bugou|travou)\b/)) return { id: 'frustrated' };

    // 1b) Dicionário linguístico: pedir ajuda, pedir para explicar de outro jeito, escolher na lista, hipóteses, comparações
    var startsGreet = has(n, /^(oi+e*|oie+|oioi|ola|opa|eae|e ai|salve|hey|hello|hi|fala( ai)?|bom dia|boa tarde|boa noite)( |$)/);
    if (!entityHint && nw <= 9 && has(n, /\b(posso (te )?(perguntar|tirar (uma )?duvida)|(tenho|to com|estou com) (uma )?(duvida|pergunta)|queria (saber|perguntar)|(deixa|deixe) eu perguntar|preciso de ajuda|uma pergunta)\b|^pode me ajudar$|(^| )(escuta|seguinte)( |$)|^me ajuda$/)) return { id: 'invite', greet: startsGreet, part: /bom dia|boa tarde|boa noite/.exec(n) };
    if (ctx.listed.length > 0 && nw <= 6) {
      var nc = n; for (var fi = 0; fi < 3; fi += 1) nc = nc.replace(/^(blz|ok|okay|beleza|entao|tipo|ai|certo|show|valeu|obrigado|ta|e|a|o|na|no|ah|hm+|hum|pode ser)( |$)/, '');
      var om = /^(primeir[ao]|segund[ao]|terceir[ao]|quart[ao]|quint[ao]|ultim[ao]|opcao ([1-9])|([1-9]))( opcao| materia| disciplina)?$/.exec(nc.replace(/^(a|o) /, ''));
      if (om) {
        var ordMap = { primeir: 0, segund: 1, terceir: 2, quart: 3, quint: 4 };
        var idx = om[2] ? Number(om[2]) - 1 : om[3] ? Number(om[3]) - 1 : /^ultim/.test(om[1]) ? ctx.listed.length - 1 : ordMap[om[1].slice(0, 7).replace(/[ao]$/, '')];
        if (idx === undefined || isNaN(idx)) idx = ordMap[om[1].slice(0, 6)];
        if (idx >= 0 && idx < ctx.listed.length) return { id: 'pick', mat: ctx.listed[idx] };
        return { id: 'pick', mat: null, idx: idx };
      }
    }
    if (!entityHint && nw <= 11 && has(n, /^(?:nao (?:entendi|compreendi|fez sentido)|fiquei confus|como assim|pode (?:me )?(?:explicar|repetir|detalhar|resumir)|explica|explique|repete|repita|de novo|detalha|detalhe|aprofunda|simplifica|simplifique|resume|resuma|resumidamente|em poucas palavras|passo a passo|com (?:um )?exemplo|exemplifica|da (?:um )?exemplo|me da (?:um )?exemplo|mais simples|de (?:um jeito|forma) (?:mais )?simples|mais detalh\w*|detalhes)(?: |$)/) && !has(n, /\b(o que e|diferenca|quanto|quantos|qual|quais|regra|trancar|tcc|credito|frequencia)\b/)) {
      return { id: 'reexplain', example: /exemplo|exemplific/.test(n), simple: /simples|simplific|resum|poucas palavras|facil/.test(n), detail: /detalh|aprofund|passo a passo|complet/.test(n) };
    }
    if (!entityHint && nw <= 3 && has(n, /^(por ?que|pq|porque)( (isso|nao|sim|esse|essa|assim))?$/)) return { id: 'why' };
    if (!entityHint && nw <= 2 && has(n, /^(que|hein|ne)$/)) return { id: 'reexplain' };
    if (!entityHint && nw <= 3 && has(n, /^(continua|continue|mais|mais uma|outra|outro|proxim[ao]|e depois|e mais|so isso)$/)) return { id: 'more' };
    if (has(n, /\b(reprovei|reprovad[oa]|bombei|fui reprovad[oa]|repeti|reprovacao)\b/) && !has(n, /\b(se eu|e se|caso eu|supondo)\b/)) return { id: 'failed', found: findSubjects(n) };
    if (!entityHint && nw <= 9 && has(n, /\b(estou (muito )?(perdid[oa]|preocupad[oa]|desesperad[oa]|ansios[oa]|atrasad[oa]|com medo|sem rumo)|to (muito )?(perdid|preocupad|desesperad|ansios|atrasad)\w*|tenho medo|deu ruim|nao sei por onde comecar|nao sei o que fazer|sera que (eu )?(consigo|vou conseguir|da|me formo|vou me formar)|vou conseguir|nao vou conseguir|vou me formar|vou me formar a tempo)\b/) || (!entityHint && nw <= 3 && has(n, /^e agora$/))) return { id: 'worry', formar: /formar|formatura|a tempo/.test(n) };
    if (has(n, /\b(e se|se eu|caso eu|supondo que|imagina que|imagine que|considerando que|o que acontece (se|com|caso)|qual (seria )?o impacto)\b/)) {
      var failV = has(n, /\b(reprov\w*|bomb\w*|nao (passar|passo|fizer|fazer|cursar|cursei|conseguir|concluir)|deixar|trancar|tranco|atrasar|adiar|perder)\b/);
      var passV = has(n, /\b(passar|passo|passei|aprovar|aprovado|aprovada|conseguir|cursar|fizer|fazer|concluir|terminar|completar)\b/);
      if (failV || passV) {
        var wf = findSubjects(n);
        return { id: 'whatif', mode: failV ? 'fail' : 'pass', found: wf.list.length ? wf : (ctx.subject || lastSubject ? { list: [ctx.subject || lastSubject], ambiguous: false } : wf) };
      }
    }
    if (has(n, /\b(compara\w*|comparacao|qual (e )?(melhor|compensa|vale mais a pena)|qual (dessas|dessa|dentre|destas|delas)|qual (libera|destrava|tranca|vale|tem) mais|o que compensa|maior numero de creditos|melhor combinacao|otimiz\w*)\b/)) {
      var cmp = findMany(raw);
      if (cmp.length >= 2) return { id: 'compare', list: cmp };
      if (ctx.listed.length >= 2) return { id: 'compare', list: ctx.listed.slice(0, 5) };
      return { id: 'priority' };
    }
    if (has(n, /\b(ementa|o que (se )?(estuda|aprende|ensina|ensinam|ve|e ensinado|tem) (em|na|no|nas|nos)|conteudo (da|de|do)|sobre o que (e|fala|trata)|objetivos? (da|de|do) (disciplina|materia)|programa da (disciplina|materia))\b/)) return { id: 'ementa', found: findSubjects(n) };
    if (!entityHint && has(n, /\b(estou apto|estou apta|tenho requisito|estou liberad[oa])\b/)) return { id: 'canTake', found: findSubjects(n) };

    // 2) Sobre ela e sobre o usuário
    if (has(n, /\b(qual (e )?(o )?meu nome|sabe (o )?meu nome|como (voce )?me chama|lembra (do )?meu nome|quem sou eu)\b/)) return { id: 'myname' };
    if (has(n, /\b(me chama(r)? (de|por)|me chame (de|por)|pode me chamar|meu nome (e|eh)|(mudar|trocar|alterar) (o )?(meu )?nome|esquecer (o )?(meu )?nome|apagar (o )?(meu )?nome|quero ser chamad[oa])\b/)) return { id: 'setname' };
    if (has(n, /\b(me trat[ae]|trate me|meus pronomes|meu pronome|(mudar|trocar|alterar) (o )?(meu )?(pronome|genero)|no (masculino|feminino|neutro)|sou (homem|mulher|menino|menina|garoto|garota|rapaz|moca|nao binario|nao binaria|nao binarie))\b/)) return { id: 'setpron' };
    if (has(n, /\b(sou (do|da) (turno )?(noturno|integral)|meu turno (e|eh)|estudo (no|de) (turno )?(noturno|integral)|turno (noturno|integral)|(mudar|trocar) (o )?(meu )?turno)\b/)) return { id: 'setshift', value: /noturn/.test(n) ? 'noturno' : /integral/.test(n) ? 'integral' : '' };
    if (has(n, /\b(meu periodo (e|eh|atual (e|eh))|estou (no|na|cursando o|cursando) \d|to (no|na) \d|sou do \d+|estou n[oa] \d+)\b/) && numberIn(n)) return { id: 'setperiod', value: numberIn(n) };
    if (!entityHint && has(n, /\b(quem (e|eh) (voce|farmacia)|quem (te )?(criou|fez|desenvolveu|programou)|qual (e )?(o )?seu nome|como (voce )?(se )?chama|o que (e|eh) (voce|a farmacia)|voce (e|eh) (uma )?(ia|robo|bot|humano|gente|pessoa)|(usa|tem) (ia|chatgpt|gpt|inteligencia artificial)|inteligencia artificial|e beta|beta)\b/)) return { id: 'who' };
    // 2b) Regras oficiais da UFRJ / PPC
    var rule = window.FarmaRegras && window.FarmaRegras.match(n);
    if (rule) return { id: 'rule', rule: rule };

    if (has(n, /\bo que voce (pode|sabe|faz|consegue)\b|\bo que (pode|sabe|faz|consegue) (me )?(fazer|ajudar|responder)\b|\bo que (voce )?(pode|sabe) fazer\b|\bcomo (voce )?(pode|consegue) (me )?ajudar\b|\b(suas|quais (sao )?(as )?suas) (funcoes|funcionalidades|habilidades|capacidades)\b|\bpara que (voce )?serve\b|\bpra que (voce )?serve\b|\bo que (da|dá) pra (voce )?fazer\b|^(me )?(ajuda|ajude|help|comandos|exemplos|menu)( por favor)?$|\bpreciso de ajuda\b|\bcomo (voce )?(funciona|usa|usar)\b|\bquais (perguntas|coisas) (posso|da pra)\b/)) return { id: 'about' };

    if (!entityHint && has(n, /\b(email|e mail|contato|contatos|telefone|professor|professora|coordenador|coordenadora|coordenacao|secretaria|chefe)\b/) && !has(n, /\b(regras?|prazo|trancar|bolsa|monitoria)\b/)) return { id: 'contacts' };
    if (!entityHint && has(n, /\b(horario|horarios|sala|salas|resultado|boletim|calendario|feriado|greve|que dia|que horas|clima|previsao)\b/) && !has(n, /\b(horario de atendimento)\b/)) return { id: 'offscope' };

    // 4) Seu progresso e planejamento
    if (has(n, /\b(glossario|o que (e|eh|significa|quer dizer|sao) (um |uma |o |a |os |as )?(pre ?requisitos?|co ?requisitos?|correquisitos?|escolha condicionada|condicionadas?|optativas?|eletivas?|obrigatorias?|crid|siga|rcs|cr|cra))\b/)) return { id: 'glossary', term: n };
    if (!entityHint && has(n, /\b(monte|montar|monta|sugira|sugere|sugestao (de )?(grade|plano)|planeje|planejar|plano ideal|grade ideal|me ajuda a (montar|escolher|planejar)|qual (grade|plano)|organiza (meu|o) (periodo|semestre))\b/)) return { id: 'plan', target: (function () { var t = /\b(\d{2}) creditos?\b/.exec(n); return t ? Number(t[1]) : null; })() };
    if (!entityHint && has(n, /\b(o que mais (destrava|libera|importa|ajuda|tranca)|qual (a )?(mais )?(importante|urgente)|prioridades?|priorizar|por onde (comecar|eu comeco)|qual puxar primeiro|o que puxar primeiro|gargalo|mais importante)\b/)) return { id: 'priority' };
    if (!entityHint && has(n, /\b(sem (pre ?requisitos?|requisitos?)|nao (tem|tenho|possuem) (pre ?requisitos?|requisitos?)|que nao (tem|precisam de|exigem) (pre ?)?requisitos?|livres de requisito)\b/)) return { id: 'free' };
    if (!entityHint && has(n, /\b(o que (eu )?(ja )?(cursei|fiz|completei|conclui)|quais (eu )?(ja )?(cursei|fiz|completei)|minhas (cursadas|concluidas)|ja cursadas|quantas (materias|disciplinas) (eu )?(ja )?(cursei|fiz|completei))\b/)) return { id: 'done' };
    if (has(n, /\b(quant[oa]s? (creditos?|horas?|materias?|disciplinas?|obrigatorias?)( e (creditos?|horas?|materias?|disciplinas?))?( ja)? (faltam|falta|restam|resta|fiz|cursei|tenho|completei)|quanto (me )?falta|falta(m)? (pra|para) (eu )?(me )?formar|(meu|o meu) progresso|progresso|como (eu )?(to|estou)|em que ponto|ja cumpri|quanto (ja )?(cursei|fiz)|falta muito|terminar (a )?faculdade|concluir (o )?curso|integralizar|colacao de grau|pendencia curricular|falta quanto|curriculo completo)\b/)) return { id: 'progress' };
    if (has(n, /\b(limite|maximo|minimo|carga minima|carga maxima).*(credito|siga|puxar)|(quantos|qual).*(creditos|credito).*(posso|pode|da pra|permite|aceita|limite)|siga (aceita|permite)\b/)) return { id: 'siga' };
    if (has(n, /\b(proximo periodo|qual (e )?(o )?meu periodo|em que periodo (eu )?(estou|to)|periodo atual)\b/)) return { id: 'nextPeriod' };
    if (has(n, /\b(quais|que|o que) (as )?(materias|disciplinas|obrigatorias|condicionadas)?.*(faltam|falta|restam|ainda falta|falto)( cursar| fazer)?|o que (ainda )?falta cursar|materias que faltam|disciplinas que faltam/) && !entityHint) return { id: 'pending' };

    // 5) Período inteiro: "matérias do 3º período".
    var intent = parseSearchIntent(raw);
    if (intent.filters.periodo && !entityHint) {
      var restTokens = stripIntent(intent.text || '');
      if (!restTokens.length) return { id: has(n, /\b(faltam|falta|pendentes?|restam)\b/) ? 'periodPending' : 'period', periodo: intent.filters.periodo };
    }
    if (!entityHint && has(n, /\b(meu periodo|do meu periodo|no meu periodo)\b/) && userPeriod()) return { id: 'period', periodo: userPeriod() };

    // pronome sozinho: "e essa?", "ela mesma"
    if (nw <= 3 && has(n, /^(e )?(essa|esse|ela|ele|aquela|aquele|dela|dele)( mesm[ao])?$/)) return lastSubject ? { id: 'followup', found: { list: [lastSubject], ambiguous: false } } : { id: 'unknown', n: n };

    // 6) Perguntas sobre disciplinas
    var found = findSubjects(intent.filters.periodo ? (intent.text || raw) : n);
    var hasEntity = found.list.length > 0;
    var canVerb = has(n, /\b(posso|consigo|da pra|pode|podem|liberad[oa]s?|disponivel|ja da|puxar|pegar|cursar|fazer|matricular|matricula|puxo)\b/);

    if (has(n, /\b(juntas?|juntos|ao mesmo tempo|no mesmo periodo|as duas|os dois|ambas|ambos)\b/) && canVerb) {
      var many = findMany(raw);
      if (many.length < 2 && ctx.listed.length >= 2) many = ctx.listed.slice(0, has(n, /\b(duas|dois|ambas|ambos)\b/) ? 2 : 4);
      if (many.length >= 2) return { id: 'together', list: many };
    }
    if (hasEntity && !found.ambiguous && has(n, /\b(quantos creditos|creditos d[eao]|quantas horas|carga horaria d[eao]|horas d[eao]|qual (o )?codigo|codigo d[eao]|que periodo|qual periodo|periodo d[eao]|e (uma )?(obrigatoria|eletiva|optativa|condicionada)|tipo d[eao]|vale quantos creditos)\b/) && !has(n, /\b(posso|pode|puxar|tranca|requisito|libera)\b/)) {
      return { id: 'fact', found: found, kind: has(n, /credito/) ? 'credits' : has(n, /\bhoras?\b|carga/) ? 'hours' : has(n, /codigo/) ? 'code' : has(n, /obrigatoria|eletiva|optativa|condicionada|tipo/) ? 'type' : 'period' };
    }
    if (has(n, /\b(cadeia (de )?pre ?requisitos?|toda a cadeia|caminho (ate|pra|para)|pre ?requisitos? (dos|das) pre ?requisitos?|tudo que (eu )?(preciso|tenho que) (cursar|fazer) (antes|ate|pra|para))\b/)) return { id: 'chain', found: found };
    if (has(n, /\b(co ?requisitos?|correquisitos?|corequisitos?|cursar junto|concomitante)\b/)) {
      if (has(n, /\bpre ?requisitos?\b/) && has(n, /\b(ou|e)\b/)) return { id: 'bothReq', found: found };
      return { id: 'coreq', found: found };
    }

    if (has(n, /\b(libera|destrava|abre|serve (de|pra|para) pre|e pre ?requisito de (que|quais|quem|o que)|pre ?requisito de (que|quais|quem|o que)|depende[m]? d[oea])\b/) || has(n, /\b(tranca|trava|trancam|travam|segura|seguram|impede|impedem|barra|bloqueia|bloqueiam|vem depois|abre (caminho|materias)|dependencias)\b/)) {
      var onlyDependents = has(n, /\b(libera|destrava|abre|serve (de|pra|para) pre|pre ?requisito de (que|quais|quem|o que)|vem depois|dependencias)\b/);
      return { id: 'locks', onlyDependents: onlyDependents, found: found };
    }
    if (has(n, /\b(pre ?requisitos?|pre req|requisitos?|precisa|precisam|precisa(r|mos)? (de|pra|para|pro)|preciso (de|pra|para|pro)|exige|exigem|o que falta (pra|para|pro)|falta (pra|para|pro)|o que (eu )?(tenho|preciso) (que )?(cursar|fazer|ter) (antes|pra|para))\b/)) return { id: 'prereqs', found: found };

    var listPhrase = has(n, /\b(o que|quais|que|quais sao as?)\b.*\b(posso|da|pode|consigo|esta|estao|tem|tenho)\b.*\b(puxar|pegar|cursar|fazer|disponiv|liberad)/) ||
      has(n, /\b(o que (eu )?(posso|devo|consigo) (puxar|pegar|cursar|fazer)|quais (materias|disciplinas) (posso|da pra|estao)|o que (esta|ta) (disponivel|liberado)|o que (eu )?puxo|me sugere|sugestao|o que puxar|disponiveis|puxaveis)\b/);
    if (listPhrase && !hasEntity) return { id: 'available' };
    if (canVerb && hasEntity) return { id: 'canTake', found: found };
    if (canVerb && !hasEntity && has(n, /\b(o que|quais|que materias|que disciplinas)\b/)) return { id: 'available' };
    if (has(n, /\b(condicionadas?|optativas?|eletivas?)\b/) && !hasEntity) return { id: 'cond' };

    // "e a CIF II?" repete o tipo da pergunta anterior com a nova disciplina
    if (hasEntity && lastIntentId && has(n, /^(e|e a|e o|e as|e os|e sobre|tambem|agora)( |$)/) && ['canTake', 'locks', 'prereqs', 'coreq', 'fact'].indexOf(lastIntentId) >= 0) {
      return { id: lastIntentId, found: found, onlyDependents: false, kind: 'credits' };
    }
    var conceptQ = has(n, /\b(o que (e|eh|sao|significa)|conceito|definicao|me explica|explica|quais materias|que materias|em que materia|onde (se )?(estuda|aprende|ve)|materias? (de|sobre)|disciplinas? (de|sobre))\b/);
    var topicHits = conceptQ ? topicSearch(n) : { terms: '', list: [] };
    if (topicHits.list.length && (!hasEntity || found.ambiguous || (topicHits.list.length > 1 && has(n, /\b(quais|que|em que)\b.*\b(materias?|disciplinas?)\b/)))) return { id: 'topic', term: topicHits.terms, list: topicHits.list };
    var conceptM = FARMA_CONCEPTS.exec(n);
    if (!hasEntity && conceptM) return { id: 'topic', term: conceptM[0], list: topicSearch(conceptM[0]).list };
    if (hasEntity) return { id: 'info', found: found };
    // pronome: "e o que ela tranca?" -> usa a última disciplina citada
    if (lastSubject && has(n, /\b(ela|ele|dela|dele|essa|esse|desta|deste|disso|e (o que|quais|quantos|quanto))\b/)) return { id: 'followup', found: { list: [lastSubject], ambiguous: false } };
    return { id: 'unknown', n: n };
  }

  // ---------- respostas ----------
  function R(html, chips) { return { html: html, chips: chips || [] }; }
  function subjectChips(m) {
    var code = m.codigo;
    var chips = [
      { label: 'O que ela tranca?', q: 'O que ' + code + ' tranca' },
      { label: 'Pré-requisitos', q: 'Pré-requisitos de ' + code }
    ];
    if (m.co || getCoreqRelatedSubjects(code).length) chips.push({ label: 'Co-requisitos', q: 'Co-requisitos de ' + code });
    return chips;
  }

  function needSubject(found, what) {
    if (found && found.list.length > 1 && found.ambiguous) {
      choice = { what: what, list: found.list.slice(0, 5) };
      return R(p('Encontrei mais de uma disciplina parecida. Qual delas você quer dizer?') + rowsHTML(found.list.slice(0, 5)),
        found.list.slice(0, 4).map(function (m) { return { label: m.codigo, q: what + ' ' + m.codigo }; }));
    }
    return R(p('Sobre qual disciplina? Me diga o nome ou o código (por exemplo, <strong>FFW361</strong>).'));
  }
  function subjectFrom(found) {
    if (found && found.list.length === 1) return found.list[0];
    if (found && found.list.length > 1 && !found.ambiguous) return found.list[0];
    return null;
  }

  function answerCanTake(m) {
    var st = statusOf(m);
    var head = bold(m) + ' (' + codeTag(m) + ', ' + esc(periodLabel(m)) + ')';
    if (st === 'passed') {
      return R(verdict('done', 'Já cursada') + p('Você já marcou ' + head + ' como cursada.') +
        (dependentsHint(m)), subjectChips(m));
    }
    var co = coreqDirect(m);
    var coInfo = '';
    if (co.length) {
      var coNames = co.map(function (c) { return '<strong>' + esc(formatName(c)) + '</strong>'; });
      var coReady = co.every(function (c) { return appState.concludedCodes.has(c.codigo) || checkReqs(c.pre, appState.concludedCodes); });
      coInfo = p('Ela tem co-requisito: precisa ser cursada junto com ' + listNames(coNames) + '. ' +
        (coReady ? 'Os pré-requisitos dessa parceira também estão cumpridos.' : 'Mas a parceira ainda tem pré-requisito pendente, então a dupla ainda não pode ser puxada.'));
    }
    if (st === 'eligible') {
      var pre = prereqList(m);
      return R(verdict('ok', 'Pode puxar') + p('Sim! ' + head + ' está disponível' +
        (pre.length ? ': você já cumpriu ' + listNames(pre.map(function (c) { return esc(formatName(c)); })) + '.' : ' e não tem pré-requisito.')) +
        coInfo + '<p class="farma-note">Carga: ' + esc(creditsOf(m)) + ' créd. · ' + esc(hoursOf(m)) + ' h.</p>', subjectChips(m));
    }
    var info = missingOf(m);
    var rows = info.missing.map(function (c) {
      var s = statusOf(c);
      return rowHTML(c, s === 'eligible' ? 'você já pode puxar' : 'também bloqueada');
    }).join('');
    return R(verdict('no', 'Ainda não') + p('Ainda não dá para puxar ' + head + '. ' +
      (info.alternatives ? 'Faltam, no caminho mais próximo:' : (info.missing.length === 1 ? 'Falta cursar:' : 'Faltam cursar:'))) +
      '<div class="farma-rows">' + rows + '</div>' + coInfo, subjectChips(m));
  }

  function dependentsHint(m) {
    var deps = getPrereqLockedSubjects(m.codigo);
    return deps.length ? p('Concluir ' + bold(m) + ' ajuda a liberar ' + deps.length + ' ' + plural(deps.length, 'matéria', 'matérias') + '.') : '';
  }

  function answerLocks(m, onlyDependents) {
    var deps = getPrereqLockedSubjects(m.codigo);
    var html = '';
    if (deps.length) {
      html += p(bold(m) + ' é pré-requisito de ' + deps.length + ' ' + plural(deps.length, 'matéria', 'matérias') + ' (ou seja, tranca):') + rowsHTML(deps, 14);
    } else {
      html += p(bold(m) + ' não tranca nenhuma matéria: não é pré-requisito de nada.');
    }
    if (!onlyDependents) {
      var pre = prereqList(m);
      html += pre.length
        ? p('Para cursar ' + bold(m) + ', por outro lado, você precisa de:') + rowsHTML(pre)
        : p('E ela não tem pré-requisito.');
    }
    return R(html, subjectChips(m).filter(function (c) { return !/tranca/.test(c.label); }));
  }

  function answerPrereqs(m) {
    var pre = prereqList(m);
    if (!pre.length) return R(p(bold(m) + ' não tem pré-requisito.' + (m.co ? '' : ' Pode ser puxada a qualquer momento.')), subjectChips(m));
    var rows = pre.map(function (c) {
      var ok = appState.concludedCodes.has(c.codigo);
      return rowHTML(c, ok ? 'cumprido' : 'pendente');
    }).join('');
    var miss = missingOf(m).missing.length;
    return R(p('Pré-requisitos de ' + bold(m) + ':') + '<div class="farma-rows">' + rows + '</div>' +
      p(miss ? 'Ainda ' + plural(miss, 'falta', 'faltam') + ' ' + miss + '.' : 'Todos já estão cumpridos.'), subjectChips(m));
  }

  function answerCoreq(m) {
    var related = getCoreqRelatedSubjects(m.codigo);
    if (!related.length) return R(p(bold(m) + ' não tem co-requisito.'), subjectChips(m));
    return R(p(bold(m) + ' ' + plural(related.length, 'tem co-requisito com', 'tem co-requisito com') + ':') + rowsHTML(related) +
      p('Co-requisito significa que as duas precisam ser cursadas <strong>no mesmo período</strong>. Ao marcar uma no planejamento, o app avisa da outra.'), subjectChips(m));
  }

  function answerInfo(m) {
    var st = statusOf(m);
    var pre = prereqList(m);
    var deps = getPrereqLockedSubjects(m.codigo);
    var html = verdict(st === 'passed' ? 'done' : st === 'eligible' ? 'ok' : 'no', st === 'passed' ? 'Cursada' : st === 'eligible' ? 'Disponível' : 'Bloqueada') +
      p(bold(m) + '<br>' + codeTag(m) + ' · ' + esc(periodLabel(m))) +
      p(esc(creditsOf(m)) + ' ' + plural(creditsOf(m), 'crédito', 'créditos') + ' · ' + esc(hoursOf(m)) + ' h') +
      p(pre.length ? 'Pré-requisitos: ' + listNames(pre.map(function (c) { return esc(c.nome); })) + '.' : 'Sem pré-requisito.');
    if (m.co) html += p('Co-requisito: ' + listNames(coreqDirect(m).map(function (c) { return esc(c.nome); })) + '.');
    html += p(deps.length ? 'Tranca ' + deps.length + ' ' + plural(deps.length, 'matéria', 'matérias') + '.' : 'Não tranca nenhuma matéria.');
    return R(html, subjectChips(m));
  }

  function answerProgress() {
    var obrig = disciplinas.filter(function (d) { return !periodIsCond(d.periodo); });
    var doneObrig = obrig.filter(function (d) { return appState.concludedCodes.has(d.codigo); });
    var credTotal = obrig.reduce(function (a, d) { return a + creditsOf(d); }, 0);
    var credDone = doneObrig.reduce(function (a, d) { return a + creditsOf(d); }, 0);
    var cond = getSelectedCondStats();
    var condCredLeft = Math.max(0, META_COND_CRED - cond.condCred);
    var condHorasLeft = Math.max(0, META_COND_HORAS - cond.condHoras);
    var pend = obrig.length - doneObrig.length;
    var horasTotal = obrig.reduce(function (a, d) { return a + hoursOf(d); }, 0);
    var horasDone = doneObrig.reduce(function (a, d) { return a + hoursOf(d); }, 0);
    var pct = credTotal ? Math.round(credDone / credTotal * 100) : 0;
    var html = p('Obrigatórias: você tem <strong>' + doneObrig.length + ' de ' + obrig.length + '</strong> disciplinas (' + pct + '% dos créditos).') +
      p('Faltam <strong>' + (credTotal - credDone) + ' créditos</strong> e <strong>' + (horasTotal - horasDone) + ' h</strong> em ' + pend + ' ' + plural(pend, 'disciplina', 'disciplinas') + ' obrigatórias.');
    if (condCredLeft === 0 && condHorasLeft === 0) {
      html += p('Escolha condicionada: meta de ' + META_COND_CRED + ' créditos / ' + META_COND_HORAS + ' h <strong>cumprida</strong>.');
    } else {
      html += p('Escolha condicionada: você tem ' + cond.condCred + ' créd. e ' + cond.condHoras + ' h; faltam <strong>' + condCredLeft + ' créd.</strong> e <strong>' + condHorasLeft + ' h</strong> (meta: ' + META_COND_CRED + ' créd. / ' + META_COND_HORAS + ' h).');
    }
    html += '<p class="farma-note">Estágios, extensão e atividades complementares não entram nessa conta.</p>';
    return R(html, [{ label: 'Quais obrigatórias faltam?', q: 'Quais obrigatórias faltam' }, { label: 'O que posso puxar?', q: 'O que posso puxar' }]);
  }

  function answerPending() {
    var pend = disciplinas.filter(function (d) { return !periodIsCond(d.periodo) && !appState.concludedCodes.has(d.codigo); });
    if (!pend.length) return R(p('Você não tem nenhuma obrigatória pendente.'));
    var byPeriod = {};
    pend.forEach(function (d) { byPeriod[d.periodo] = (byPeriod[d.periodo] || 0) + 1; });
    var resumo = Object.keys(byPeriod).sort(function (a, b) { return a - b; }).map(function (k) { return k + 'º: ' + byPeriod[k]; }).join(' · ');
    return R(p('Faltam <strong>' + pend.length + '</strong> obrigatórias.') + p('Por período: ' + esc(resumo) + '.') +
      p('As mais próximas de você (já disponíveis):') +
      rowsHTML(pend.filter(function (d) { return statusOf(d) === 'eligible'; }), 8),
      [{ label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam' }]);
  }

  function answerAvailable(raw) {
    var intent = parseSearchIntent(raw);
    var all = getPlannerAvailableSubjects();
    var cond = /\b(condicionad|optativ|eletiv)/.test(norm(raw));
    var list = all.filter(function (d) { return cond ? periodIsCond(d.periodo) : true; });
    if (intent.filters.periodo) list = list.filter(function (d) { return Number(d.periodo) === intent.filters.periodo; });
    var obrig = list.filter(function (d) { return !periodIsCond(d.periodo); });
    var cd = list.filter(function (d) { return periodIsCond(d.periodo); });
    if (!list.length) return R(p('Não encontrei nenhuma disciplina disponível com esse critério agora.'));
    var html = p('Você pode puxar <strong>' + list.length + '</strong> ' + plural(list.length, 'disciplina', 'disciplinas') +
      (obrig.length && cd.length ? ' (' + obrig.length + ' obrigatórias e ' + cd.length + ' de escolha condicionada)' : '') + '.');
    if (obrig.length) html += p('Obrigatórias:') + rowsHTML(obrig, 8);
    if (cd.length && (cond || !obrig.length)) html += p('Escolha condicionada:') + rowsHTML(cd, 6);
    else if (cd.length) html += '<p class="farma-note">Pergunte "quais condicionadas posso puxar" para ver as ' + cd.length + ' de escolha condicionada.</p>';
    return R(html + '<p class="farma-note">Na aba “O que puxar?” você seleciona e soma créditos.</p>',
      [{ label: 'Abrir “O que puxar?”', go: 'modal-planner' }, { label: 'Quais condicionadas posso puxar?', q: 'Quais condicionadas posso puxar' }]);
  }

  function answerPeriod(n) {
    var list = disciplinas.filter(function (d) { return Number(d.periodo) === n; });
    if (!list.length) return R(p('Não encontrei disciplinas do ' + n + 'º período.'));
    var done = list.filter(function (d) { return appState.concludedCodes.has(d.codigo); }).length;
    return R(p('O ' + n + 'º período tem <strong>' + list.length + '</strong> disciplinas; você cursou ' + done + '.') + rowsHTML(list),
      [{ label: 'O que posso puxar?', q: 'O que posso puxar' }]);
  }

  function answerCond() {
    var list = disciplinas.filter(function (d) { return periodIsCond(d.periodo) && statusOf(d) === 'eligible'; });
    return R(p('Das disciplinas de escolha condicionada, <strong>' + list.length + '</strong> ' + plural(list.length, 'está disponível', 'estão disponíveis') + ' para você agora:') + rowsHTML(list, 10),
      [{ label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam' }]);
  }

  function answerSiga() {
    return R(p('O SIGA aceita de <strong>' + SIGA_MIN_CRED + '</strong> a <strong>' + SIGA_MAX_CRED + '</strong> créditos por período. A aba “O que puxar?” soma o que você seleciona e avisa quando passa dos limites.'),
      [{ label: 'Abrir “O que puxar?”', go: 'modal-planner' }]);
  }

  function answerNextPeriod() {
    var n = getNextPlanningPeriod();
    var declared = userPeriod();
    return R(p('Pelo que você marcou, o seu próximo período a completar é o <strong>' + n + 'º</strong> (o primeiro com obrigatória ainda não cursada).') +
      (declared ? p('No seu perfil você informou o <strong>' + declared + 'º período</strong>' + (declared !== n ? ', que é diferente do que as suas marcações indicam. Vale conferir o que você já marcou como cursado.' : ', e isso bate com as suas marcações.')) : ''),
      [{ label: 'Ver matérias do ' + n + 'º', q: 'Matérias do ' + n + ' período' }]);
  }

  // ---------- perfil do usuário (compartilhado com as Configurações) ----------
  function UP() { return window.UserProfile || null; }
  function userName() { var u = UP(); return u ? u.name() : ''; }
  function userPeriod() { var u = UP(); var v = u ? Number(u.period()) : 0; return v >= 1 ? v : 0; }
  function g(m, f, n, unset) { var u = UP(); return u ? u.gen(m, f, n, unset) : (unset !== undefined ? unset : n); }
  function userShift() { var u = UP(); var v = u && u.shift ? u.shift() : ''; return v === 'noturno' || v === 'integral' ? v : ''; }
  function shiftLabel(v) { return v === 'noturno' ? 'Noturno' : 'Integral'; }
  function nameHTML() { return '<strong>' + esc(userName()) + '</strong>'; }
  var SKIP_KEY = 'planejador_farma_skipname_v1';
  function nameSkipped() { try { return localStorage.getItem(SKIP_KEY) === '1'; } catch (e) { return false; } }
  function setSkip(v) { try { if (v) localStorage.setItem(SKIP_KEY, '1'); else localStorage.removeItem(SKIP_KEY); } catch (e) { /* sem armazenamento */ } }
  function needsName() { return !userName() && !nameSkipped(); }

  var awaiting = null;   // 'name' | 'pron' | 'newname' | null
  var pronTries = 0;
  var choice = null;     // desambiguação: { what, list }

  var NAME_STOP = /\b(posso|puxar|quanto|quantos|quantas|qual|quais|como|quando|onde|porque|que|nao|sim|ola|oi|ajuda|obrigado|obrigada|tchau|tranca|requisito|requisitos|creditos|periodo|disciplina|materia|bolsa|frequencia|prazo|carga|cursar|pegar)\b/;
  var NAME_PARTICLES = { da: 1, de: 1, do: 1, dos: 1, das: 1, e: 1 };
  function parseName(raw) {
    var t = String(raw || '').trim().replace(/[?!.,;:]+$/, '');
    var n = norm(t);
    if (/\b(prefiro nao|nao quero|nao vou|sem nome|pular|anonimo|nao precisa|deixa pra la|nao importa)\b/.test(n)) return { skip: true };
    t = t.replace(/^(oi|ol[aá]|opa|e a[ií]|eae|bom dia|boa tarde|boa noite)[,!\s]+/i, '');
    t = t.replace(/^(meu nome (é|e|eh)|me chamo|pode me chamar de|pode me chama de|pode me chamar|me chama de|me chame de|me chama|me chame|quero ser chamad[oa] de|eu sou (o|a)?|sou (o|a)?|aqui (é|e|eh) (o|a)?|nome[:\s]+)\s*/i, '').replace(/^(é|e|eh)\s+/i, '').trim();
    var parts = t.split(/\s+/).filter(Boolean);
    if (!parts.length || parts.length > 3) return null;
    if (NAME_STOP.test(norm(t))) return null;
    var ok = parts.every(function (w) { return /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’-]{1,19}$/.test(w); });
    if (!ok) return null;
    var name = parts.map(function (w, k) {
      var low = w.toLowerCase();
      return k > 0 && NAME_PARTICLES[low] ? low : low.charAt(0).toUpperCase() + low.slice(1);
    }).join(' ');
    return { name: name };
  }
  function parsePronoun(n) {
    if (/\b(neutro|neutre|elu|nao binari[oae]|tanto faz|qualquer)\b/.test(n)) return 'n';
    if (/\b(ela|feminino|mulher|menina|moca|garota)\b/.test(n)) return 'f';
    if (/\b(ele|masculino|homem|menino|rapaz|garoto)\b/.test(n)) return 'm';
    return null;
  }
  var PRON_LABEL = { m: 'masculino', f: 'feminino', n: 'neutro' };

  // ---------- respostas novas ----------
  function SUGGEST_LIST() {
    return [
      { q: 'Posso puxar Farmacocinética?', k: 'posso puxar cursar disciplina materia liberada disponivel' },
      { q: 'O que Fisiologia Humana tranca?', k: 'tranca libera depende destrava prerequisito' },
      { q: 'Pré-requisitos de Toxicologia Geral', k: 'prerequisito requisito precisa exige' },
      { q: 'Quantos créditos faltam?', k: 'creditos faltam falta progresso formar restam' },
      { q: 'O que posso puxar?', k: 'puxar disponiveis liberadas sugestao agora' },
      { q: 'Monte uma grade para o próximo período', k: 'montar monte grade plano periodo sugestao organizar' },
      { q: 'O que mais destrava?', k: 'destrava prioridade importante primeiro comecar' },
      { q: 'Quantos créditos tem Farmacocinética?', k: 'creditos horas carga codigo vale' },
      { q: 'Como trancar a matrícula?', k: 'trancar trancamento matricula' },
      { q: 'Qual a frequência mínima?', k: 'frequencia faltas presenca aprovacao reprovar' },
      { q: 'Quais os requisitos das bolsas?', k: 'bolsa monitoria pibiac iniciacao cientifica' },
      { q: 'Qual a carga horária total do curso?', k: 'carga horaria horas curso total' },
      { q: 'Qual o prazo máximo para me formar?', k: 'prazo maximo formar anos periodos tempo' },
      { q: 'Como é calculado o CR?', k: 'cr cra coeficiente calculo media nota' },
      { q: 'O que são atividades complementares?', k: 'atividades complementares horas' },
      { q: 'Como funciona a extensão?', k: 'extensao horas projeto' },
      { q: 'Regras do TCC', k: 'tcc monografia trabalho conclusao orientador' },
      { q: 'O que é Dignidade Acadêmica?', k: 'dignidade laude honra diploma' },
      { q: 'Qual o limite de créditos no SIGA?', k: 'limite creditos siga maximo minimo' },
      { q: 'O que você pode fazer?', k: 'ajuda funcoes fazer pode sabe' }
    ];
  }
  function suggestionsFor(n) {
    var toks = n.split(' ').filter(function (t) { return t.length > 2 && !STOP_SET[t]; });
    if (!toks.length) return [];
    return SUGGEST_LIST().map(function (it) {
      var keys = (norm(it.q) + ' ' + it.k).split(' ');
      var hit = 0;
      toks.forEach(function (t) { if (keys.indexOf(t) >= 0) hit += 1; });
      return { it: it, score: hit };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3).map(function (x) { return x.it; });
  }

  function timeGreeting() {
    var h = new Date().getHours();
    return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }
  function exampleChips() {
    return [
      { label: 'O que você pode fazer?', q: 'O que você pode fazer?' },
      { label: 'O que posso puxar?', q: 'O que posso puxar?' },
      { label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam?' },
      { label: 'Como trancar a matrícula?', q: 'Como trancar a matrícula?' }
    ];
  }
  function cardsHTML() {
    var cards = [
      ['Posso puxar Farmacocinética?', 'Confira pré-requisitos'],
      ['Quantos créditos faltam?', 'Veja o seu progresso'],
      ['Monte uma grade para o próximo período', 'Uma sugestão pronta'],
      ['O que você pode fazer?', 'Veja o que eu sei fazer']
    ];
    var ICONS = [
      '<path d="M5 12.5l4.2 4.2L19 7"></path><circle cx="12" cy="12" r="9.2"></circle>',
      '<rect x="4.5" y="11" width="3.6" height="8" rx="1.2"></rect><rect x="10.2" y="5" width="3.6" height="14" rx="1.2"></rect><rect x="15.9" y="9" width="3.6" height="10" rx="1.2"></rect>',
      '<rect x="4" y="5" width="16" height="15" rx="3"></rect><path d="M4 10h16M9 3.5v3M15 3.5v3"></path>',
      '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"></path>'
    ];
    return '<p class="farma-cards-title">' + 'Sugestões rápidas' + '</p><div class="farma-cards">' + cards.map(function (c, i) {
      return '<button type="button" class="farma-card" data-farma-ask="' + esc(c[0]) + '"><span class="farma-card-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[i % ICONS.length] + '</svg></span><span class="farma-card-txt"><strong>' + esc(c[0]) + '</strong><small>' + esc(c[1]) + '</small></span></button>';
    }).join('') + '</div>';
  }

  function answerGreet(intent) {
    var tod = intent.part ? cap(intent.part[0]) : timeGreeting();
    return R(p(tod + (userName() ? ', ' + nameHTML() : '') + '! Em que posso ajudar hoje?'), exampleChips());
  }
  function answerHowAre() {
    return R(p('Tudo bem por aqui' + (userName() ? ', ' + nameHTML() : '') + '! Pronta para ajudar com a sua grade. O que você quer saber?'), exampleChips());
  }
  function answerWho() {
    return R(p('Eu sou a <strong>FarmacIA</strong>, assistente dos alunos de Farmácia aqui dentro do Planejador Acadêmico.') +
      p(window.FarmaMod ? 'Sobre a sua grade e as regras da UFRJ, eu <strong>não uso IA</strong>: consulto os dados do app e os documentos oficiais. Para explicar <strong>conteúdo de Farmácia</strong>, posso usar uma <strong>IA online</strong>, só se você permitir (pergunte “o que é enviado?”); sem internet, uso o material local.' : 'Não sou uma IA generativa: não invento respostas. Eu leio a sua pergunta e consulto as regras e os dados do app (grade, pré-requisitos, seu progresso) e dos documentos oficiais da UFRJ.') +
      p('Estou em <strong>beta</strong>: ainda erro e não entendo tudo. Quanto mais claro o pedido, melhor eu respondo.'),
      [{ label: 'O que você pode fazer?', q: 'O que você pode fazer?' }]);
  }
  function answerAbout() {
    function sec(title, items) { return '<p><strong>' + title + '</strong><br>' + items.map(function (i) { return '• ' + i; }).join('<br>') + '</p>'; }
    var html = p((userName() ? nameHTML() + ', a' : 'A') + 'qui está o que eu sei fazer hoje:') +
      sec('Sua grade', ['Dizer se você pode puxar uma matéria (“Posso puxar CIF I?”)', 'Pré-requisitos, co-requisitos e o que cada matéria tranca', 'Créditos, carga horária e período de qualquer disciplina', 'Conferir se duas matérias podem ser puxadas juntas']) +
      sec('Seu planejamento', ['Listar o que você pode puxar agora e o que mais destrava', 'Sugerir uma grade para o próximo período', 'Mostrar quantos créditos e disciplinas faltam e o que você já cursou', 'Simular cenários (“e se eu reprovar em X?”) e comparar disciplinas', 'Mostrar a ementa de cada disciplina, segundo o PPC']) +
      sec('Regras da UFRJ (Manual Estudantil e PPC)', ['Trancamento, cancelamento, frequência, nota mínima, CR e CRA', 'Prazo máximo, carga horária, extensão, atividades complementares e TCC', 'Bolsas, Dignidade Acadêmica, dispensa de disciplina e exercícios domiciliares']) +
      sec('Vida acadêmica na Farmácia', ['Atendimento, e-mails e local da Coordenação e da Secretaria de Graduação', 'Como funcionam pedidos de inscrição, CRID, vagas, troca de turma e as letras do protocolo', 'Concomitância e quebra de pré-requisito, horário sobreposto e limite de um terço fora do curso', 'Professor orientador, plano de estudos, BOA e o Centro Acadêmico (CAFar)']) +
      sec('Conversa', ['Entendo abreviações e erros de digitação (“oq vc pd fazer”)', 'Entendo respostas curtas (“a segunda”, “por quê?”, “explica de novo”) e posso explicar com exemplo', 'Você pode mudar nome, pronome e período quando quiser (“me chama de ...”)']) +
      sec('O que ainda não faço', ['Cardápio do RU, horários de aula, salas ou notas. Ainda estou em beta.']);
    return R(html, [{ label: 'O que posso puxar?', q: 'O que posso puxar?' }, { label: 'Monte uma grade', q: 'Monte uma grade para o próximo período' }, { label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam?' }, { label: 'Como trancar a matrícula?', q: 'Como trancar a matrícula?' }]);
  }
  function answerMyName() {
    if (!userName()) { awaiting = 'name'; return R(p('Ainda não sei o seu nome. <strong>Como posso te chamar?</strong>'), [{ label: 'Prefiro não dizer', q: 'Prefiro não dizer' }]); }
    var pr = UP() ? UP().pronoun() : '';
    var extra = (pr ? ' Vou me referir a você no ' + PRON_LABEL[pr] + '.' : '') + (userPeriod() ? ' Você está no ' + userPeriod() + 'º período.' : '') + (userShift() ? ' Seu turno é o ' + shiftLabel(userShift()).toLowerCase() + '.' : '');
    return R(p('Você é ' + nameHTML() + '.' + extra + ' Dá para mudar isso nas Configurações, em Usuário, ou me dizendo “me chama de ...”.'));
  }
  function answerSetName(raw) {
    var n = norm(raw);
    if (/\b(esquecer|apagar)\b/.test(n)) {
      if (UP()) UP().set({ name: '' });
      setSkip(true); awaiting = null;
      return R(p('Pronto, esqueci o seu nome. Se quiser que eu volte a te chamar por ele, é só dizer “me chama de ...”.'));
    }
    var r = parseName(raw);
    if (r && r.name) {
      if (UP()) UP().set({ name: r.name }); setSkip(false); awaiting = null;
      return R(p('Combinado! De agora em diante vou te chamar de <strong>' + esc(r.name) + '</strong>.'), exampleChips());
    }
    awaiting = 'newname';
    return R(p('Claro! Como você quer ser chamado' + g('', 'a', '(a)', '(a)') + '?'), [{ label: 'Prefiro não dizer', q: 'Prefiro não dizer' }]);
  }
  function answerSetPron(raw) {
    var v = parsePronoun(norm(raw));
    if (v) {
      if (UP()) UP().set({ pronoun: v }); awaiting = null;
      return R(p('Anotado! Vou me referir a você no <strong>' + PRON_LABEL[v] + '</strong>' + (userName() ? ', ' + nameHTML() : '') + '.'));
    }
    awaiting = 'pron'; pronTries = 0;
    return R(p('Como você prefere que eu me refira a você?'), [{ label: 'Ele', q: 'Ele' }, { label: 'Ela', q: 'Ela' }, { label: 'Neutro', q: 'Neutro' }]);
  }
  function answerSetShift(v) {
    if (!v) { return R(p('Qual é o seu turno: <strong>integral</strong> ou <strong>noturno</strong>?'), [{ label: 'Integral', q: 'Sou do integral' }, { label: 'Noturno', q: 'Sou do noturno' }]); }
    if (UP()) UP().set({ shift: v });
    return R(p('Anotei: você é do turno <strong>' + shiftLabel(v).toLowerCase() + '</strong>. Vou usar isso para destacar o atendimento e as regras do seu turno.'), [{ label: 'Atendimento da coordenação', q: 'Atendimento da coordenação' }]);
  }
  // Destaca, numa regra que fala dos dois turnos, a linha do turno do perfil.
  function shiftHighlight(html) {
    var sh = userShift();
    if (!sh) return '';
    var key = '<strong>Turno ' + shiftLabel(sh) + ':</strong>';
    var i = html.indexOf(key);
    if (i < 0) return '';
    var rest = html.slice(i), e = rest.search(/<br>|<\/p>/);
    return p('Pelo seu perfil, você é do turno <strong>' + shiftLabel(sh).toLowerCase() + '</strong>. ' + (e > 0 ? rest.slice(0, e) : rest));
  }
  function answerSetPeriod(v) {
    if (v < 1 || v > 11) return R(p('Esse período não existe no curso. Me diga um número de 1 a 11.'));
    if (UP()) UP().set({ period: v });
    return R(p('Anotei: você está no <strong>' + v + 'º período</strong>. Pergunte “matérias do meu período” quando quiser.'), [{ label: 'Matérias do meu período', q: 'Matérias do meu período' }]);
  }
  function answerThanks() { return R(p('De nada' + (userName() ? ', ' + nameHTML() : '') + '! Quando precisar, é só chamar.'), exampleChips().slice(0, 2)); }
  function answerBye(intent) { return R(p((intent && intent.tmj ? 'Tamo junto' : 'Até mais') + (userName() ? ', ' + nameHTML() : '') + '! Bons estudos.')); }
  function answerAck(intent) {
    if (intent.word === 'nao') return R(p('Tudo bem! Se mudar de ideia, é só perguntar.'));
    return R(p('Certo! Quer saber mais alguma coisa?'), exampleChips().slice(0, 3));
  }
  function answerPraise() { return R(p('Que bom ouvir isso' + (userName() ? ', ' + nameHTML() : '') + '! Estou em beta e aprendendo a cada dia. Se tiver outra dúvida, pode mandar.')); }
  function answerFrustrated(raw) {
    if (/explic(ar|o) de novo|vou explicar/.test(norm(raw || ''))) return R(p('Claro' + (userName() ? ', ' + nameHTML() : '') + ', pode explicar de novo. Pode citar o nome ou o código da disciplina, que eu me encontro melhor.'), exampleChips().slice(0, 3));
    return R(p('Poxa, desculpa por isso' + (userName() ? ', ' + nameHTML() : '') + '. Ainda estou em <strong>beta</strong> e posso errar. Tente perguntar de outro jeito, citando o nome ou o código da disciplina, ou escolha um exemplo:'), exampleChips());
  }

  function answerFact(m, kind) {
    var cred = creditsOf(m), hrs = hoursOf(m);
    var html;
    if (kind === 'credits') html = p(bold(m) + ' vale <strong>' + cred + ' ' + plural(cred, 'crédito', 'créditos') + '</strong> (' + esc(hrs) + ' h).');
    else if (kind === 'hours') html = p(bold(m) + ' tem <strong>' + esc(hrs) + ' h</strong> de carga horária (' + cred + ' ' + plural(cred, 'crédito', 'créditos') + ').');
    else if (kind === 'code') html = p('O código de ' + bold(m) + ' é ' + codeTag(m) + '.');
    else if (kind === 'type') html = p(bold(m) + ' é ' + (periodIsCond(m.periodo) ? 'uma disciplina de <strong>escolha condicionada</strong> (eletiva).' : '<strong>obrigatória</strong>, do ' + m.periodo + 'º período.'));
    else html = p(bold(m) + ' é ' + (periodIsCond(m.periodo) ? 'de <strong>escolha condicionada</strong>, sem período fixo.' : 'do <strong>' + m.periodo + 'º período</strong>.'));
    html += '<p class="farma-note">Código ' + esc(m.codigo) + ' · ' + esc(periodLabel(m)) + '. Um crédito equivale a 15 h de aula teórica ou 30 h de prática por semestre.</p>';
    return R(html, subjectChips(m));
  }

  function answerTogether(list) {
    var todo = list.filter(function (m) { return statusOf(m) !== 'passed'; });
    var blocked = todo.filter(function (m) { return statusOf(m) === 'blocked'; });
    var names = listNames(list.map(function (m) { return '<strong>' + esc(formatName(m)) + '</strong>'; }));
    var credits = todo.reduce(function (a, m) { return a + creditsOf(m); }, 0);
    var html;
    if (!todo.length) return R(verdict('done', 'Já cursadas') + p('Você já cursou ' + names + '.'));
    if (blocked.length) {
      html = verdict('no', 'Ainda não') + p('Não dá para puxar ' + names + ' juntas por enquanto:') +
        blocked.map(function (m) {
          var miss = missingOf(m).missing;
          return p(bold(m) + ' ainda precisa de ' + listNames(miss.map(function (c) { return esc(formatName(c)); })) + '.');
        }).join('');
    } else {
      html = verdict('ok', 'Dá sim') + p('Você pode puxar ' + names + ' no mesmo período: os pré-requisitos de ' + (todo.length > 1 ? 'todas' : 'ela') + ' estão cumpridos.');
    }
    var partners = [];
    todo.forEach(function (m) { coreqDirect(m).forEach(function (c) { if (list.indexOf(c) < 0 && partners.indexOf(c) < 0) partners.push(c); }); });
    if (partners.length) html += p('Atenção: ' + listNames(partners.map(function (c) { return '<strong>' + esc(formatName(c)) + '</strong>'; })) + ' é co-requisito e precisa ser cursada junto.');
    html += '<p class="farma-note">Somam ' + credits + ' ' + plural(credits, 'crédito', 'créditos') + '. O SIGA aceita de ' + SIGA_MIN_CRED + ' a ' + SIGA_MAX_CRED + ' por período. Confira também a oferta e os horários no SIGA.</p>';
    return R(html, [{ label: 'Abrir “O que puxar?”', go: 'modal-planner' }]);
  }

  function depCount(m) { return getPrereqLockedSubjects(m.codigo).length; }
  function answerPriority() {
    var pool = getPlannerAvailableSubjects().filter(function (d) { return !periodIsCond(d.periodo); });
    if (!pool.length) return R(p('Não encontrei obrigatórias disponíveis agora. Veja as de escolha condicionada em “Quais condicionadas posso puxar?”.'));
    var ranked = pool.slice().sort(function (a, b) { return depCount(b) - depCount(a) || Number(a.periodo) - Number(b.periodo); }).slice(0, 8);
    var html = p('As obrigatórias disponíveis que mais abrem caminho (quantas matérias dependem de cada uma):') +
      '<div class="farma-rows">' + ranked.map(function (m) { var c = depCount(m); return rowHTML(m, c ? 'destrava ' + c : 'não destrava nada'); }).join('') + '</div>' +
      '<p class="farma-note">Priorizar quem destrava mais ajuda a não travar a sua grade nos próximos períodos.</p>';
    return R(html, [{ label: 'Monte uma grade', q: 'Monte uma grade para o próximo período' }]);
  }

  function answerFree() {
    var list = disciplinas.filter(function (d) { return !d.pre && !appState.concludedCodes.has(d.codigo); });
    var ob = list.filter(function (d) { return !periodIsCond(d.periodo); });
    var cd = list.filter(function (d) { return periodIsCond(d.periodo); });
    var html = p('Disciplinas que você ainda não cursou e que <strong>não têm pré-requisito</strong>: ' + ob.length + ' obrigatórias e ' + cd.length + ' de escolha condicionada.');
    if (ob.length) html += p('Obrigatórias:') + rowsHTML(ob, 8);
    if (cd.length) html += p('Escolha condicionada:') + rowsHTML(cd, 5);
    return R(html);
  }

  function answerDone() {
    var obrig = disciplinas.filter(function (d) { return !periodIsCond(d.periodo); });
    var done = obrig.filter(function (d) { return appState.concludedCodes.has(d.codigo); });
    if (!done.length && !appState.concludedCodes.size) return R(p('Você ainda não marcou nenhuma disciplina como cursada. Marque na tela inicial para eu conseguir ajudar melhor.'));
    var per = {};
    obrig.forEach(function (d) { per[d.periodo] = per[d.periodo] || { t: 0, d: 0 }; per[d.periodo].t += 1; if (appState.concludedCodes.has(d.codigo)) per[d.periodo].d += 1; });
    var lines = Object.keys(per).sort(function (a, b) { return a - b; }).map(function (k) { return k + 'º período: ' + per[k].d + ' de ' + per[k].t; });
    return R(p('Você já cursou <strong>' + done.length + ' de ' + obrig.length + '</strong> obrigatórias.') + '<p>' + lines.map(esc).join('<br>') + '</p>',
      [{ label: 'Quantos créditos faltam?', q: 'Quantos créditos faltam?' }, { label: 'O que posso puxar?', q: 'O que posso puxar?' }]);
  }

  function answerPeriodPending(n) {
    var list = disciplinas.filter(function (d) { return Number(d.periodo) === n && !appState.concludedCodes.has(d.codigo); });
    if (!list.length) return R(p('Você já cursou tudo do ' + n + 'º período. Parabéns!'));
    return R(p('Do ' + n + 'º período ainda ' + plural(list.length, 'falta', 'faltam') + ' <strong>' + list.length + '</strong>:') + rowsHTML(list));
  }

  // Sugestão de grade: prioriza obrigatórias de períodos mais baixos e que mais destravam, respeitando co-requisitos.
  function answerPlan(target) {
    var goal = target ? Math.max(SIGA_MIN_CRED, Math.min(SIGA_MAX_CRED, target)) : 24;
    var pool = getPlannerAvailableSubjects();
    var avail = {};
    pool.forEach(function (d) { avail[d.codigo] = true; });
    var obrig = pool.filter(function (d) { return !periodIsCond(d.periodo); })
      .sort(function (a, b) { return Number(a.periodo) - Number(b.periodo) || depCount(b) - depCount(a) || creditsOf(b) - creditsOf(a); });
    var cond = getSelectedCondStats();
    var needCond = Math.max(0, META_COND_CRED - cond.condCred) > 0;
    var conds = needCond ? pool.filter(function (d) { return periodIsCond(d.periodo); }).sort(function (a, b) { return creditsOf(b) - creditsOf(a); }) : [];
    var sel = [], chosen = {}, total = 0;
    function tryAdd(m) {
      if (chosen[m.codigo]) return;
      var group = [m];
      var okGroup = true;
      getCoreqRelatedSubjects(m.codigo).forEach(function (c) {
        if (appState.concludedCodes.has(c.codigo)) return;
        if (!avail[c.codigo]) { okGroup = false; return; }
        if (!chosen[c.codigo] && group.indexOf(c) < 0) group.push(c);
      });
      if (!okGroup) return;
      var cr = group.reduce(function (a, d) { return a + creditsOf(d); }, 0);
      if (total + cr > goal) return;
      group.forEach(function (d) { chosen[d.codigo] = true; sel.push(d); });
      total += cr;
    }
    obrig.forEach(tryAdd);
    if (total < goal) conds.forEach(tryAdd);
    if (!sel.length) return R(p('Não consegui montar uma sugestão agora: não há disciplinas disponíveis que caibam em ' + goal + ' créditos.'));
    var html = p('Uma sugestão de <strong>' + total + ' créditos</strong> (meta de ' + goal + ') com o que você já pode puxar:') + rowsHTML(sel) +
      '<p class="farma-note">Escolhi primeiro as obrigatórias dos períodos mais baixos e as que mais destravam, sempre juntando co-requisitos. É só uma sugestão: confira oferta, vagas e horários no SIGA.</p>';
    return R(html, [{ label: 'Abrir “O que puxar?”', go: 'modal-planner' }, { label: 'O que mais destrava?', q: 'O que mais destrava?' }]);
  }

  function answerGlossary(n) {
    var html;
    if (/co ?requisito|correquisito/.test(n)) html = p('<strong>Co-requisito</strong> é uma disciplina que precisa ser cursada <strong>no mesmo período</strong> que outra. Ao marcar uma no planejamento, o app avisa da outra.');
    else if (/pre ?requisito/.test(n)) html = p('<strong>Pré-requisito</strong> é uma disciplina que você precisa ter cursado, com aprovação, <strong>antes</strong> de se inscrever em outra. Quando uma matéria é pré-requisito de várias, dizemos que ela “tranca” as demais.');
    else if (/condicionada|optativa|eletiva/.test(n)) html = p('<strong>Escolha condicionada</strong> são as disciplinas eletivas do currículo: você escolhe quais cursar até completar <strong>' + META_COND_CRED + ' créditos e ' + META_COND_HORAS + ' horas</strong>.');
    else if (/obrigatoria/.test(n)) html = p('<strong>Obrigatórias</strong> são as disciplinas que todo aluno precisa cursar, organizadas por período na grade do curso.');
    else if (/crid/.test(n)) html = p('<strong>CRID</strong> é a Confirmação de Registro de Inscrição em Disciplinas: o comprovante das disciplinas em que você está inscrito. Vale emitir depois do prazo de inscrição.');
    else if (/siga/.test(n)) html = p('<strong>SIGA</strong> é o sistema acadêmico da UFRJ, onde você faz os pedidos de inscrição em disciplinas e consulta boletim e histórico.');
    else if (/rcs/.test(n)) html = p('<strong>RCS</strong> é o Requisito Curricular Suplementar: atividade do currículo, como o TCC, que conta créditos, mas não é uma disciplina comum.');
    else html = p('Posso explicar pré-requisito, co-requisito, escolha condicionada, obrigatórias, CRID, SIGA e RCS. Qual deles?');
    return R(html);
  }

  function answerUnknown(n) {
    var sugg = suggestionsFor(n);
    if (sugg.length) {
      return R(p('Não tenho certeza se entendi' + (userName() ? ', ' + nameHTML() : '') + '. Você quis dizer algo como:') + p('Ainda estou em beta. Se não for isso, tente citar o nome ou o código da disciplina.'),
        sugg.map(function (s) { return { label: s.q, q: s.q }; }));
    }
    return R(p('Não consegui entender essa' + (userName() ? ', ' + nameHTML() : '') + '. Ainda estou em <strong>beta</strong> e conheço pré-requisitos, o seu progresso, sugestões de grade e regras da UFRJ. Tente perguntar de outro jeito ou veja o que eu sei fazer:'), exampleChips());
  }

  function welcomeHTML() {
    var html = p('Eu sou a <strong>FarmacIA</strong>, assistente dos alunos aqui dentro do Planejador.') +
      p('Ainda estou em <strong>beta</strong>, então posso não entender direito o que você pede. Tenha um pouquinho de paciência comigo, combinado? Se eu errar, tente perguntar de outro jeito.');
    html += needsName() ? p('Para começar: <strong>como posso te chamar?</strong>') : p('O que você quer saber hoje?') + cardsHTML();
    return html;
  }
  // ---------- montagem da resposta ----------
  var LEAD_IDS = { progress: 1, pending: 1, available: 1, period: 1, periodPending: 1, cond: 1, siga: 1, nextPeriod: 1, canTake: 1, locks: 1, prereqs: 1, coreq: 1, info: 1, followup: 1, fact: 1, together: 1, plan: 1, priority: 1, free: 1, done: 1, rule: 1, glossary: 1 };
  var LEADS = ['Certo', 'Pronto', 'Olha só', 'Beleza', 'Vamos lá', 'Boa pergunta'];
  var leadIdx = 0;
  function withLead(html) {
    if (!userName()) return html;
    var lead = LEADS[leadIdx % LEADS.length]; leadIdx += 1;
    return html.replace(/^<p>/, '<p>' + lead + ', ' + nameHTML() + '. ');
  }

  function resolveChoice(text) {
    if (!choice) return null;
    var n = norm(text);
    var picked = null, idx = -1;
    var m = /^\s*(\d)\s*$/.exec(n);
    if (m) idx = Number(m[1]) - 1;
    else if (/^(a |o )?primeir/.test(n)) idx = 0;
    else if (/^(a |o )?segund/.test(n)) idx = 1;
    else if (/^(a |o )?terceir/.test(n)) idx = 2;
    else if (/^(a |o )?quart/.test(n)) idx = 3;
    else if (/^(a |o )?ultim/.test(n)) idx = choice.list.length - 1;
    if (idx >= 0 && choice.list[idx]) picked = choice.list[idx];
    if (!picked) {
      var toks = stripIntent(text);
      if (toks.length) {
        var hits = choice.list.filter(function (d) { var hay = norm(d.nome + ' ' + d.codigo); return toks.every(function (t) { return hay.indexOf(t) >= 0; }); });
        if (hits.length === 1) picked = hits[0];
      }
    }
    if (picked) { var what = choice.what; choice = null; return what + ' ' + picked.codigo; }
    choice = null;
    return null;
  }


  // ---------- ementas (PPC), tópicos e conceitos de Farmácia ----------
  var FARMA_CONCEPTS = /\b(farmacos?|medicamentos?|principio ativo|excipientes?|forma farmaceutica|posologia|biodisponibilidade|bioequivalencia|metabolismo|absorcao|interacao medicamentosa|efeito adverso|reacao adversa|dispensacao|prescricao|dissolucao|solubilidade|esterilidade|contaminacao|registro sanitario|bula|anvisa|vigilancia sanitaria|assuntos regulatorios|controle de qualidade|garantia da qualidade|farmacologia|farmacodinamica|toxicologia|fitoterapia|atencao farmaceutica|farmacia hospitalar|imunologia|hematologia|parasitologia|patologia|anatomia|farmacotecnica|farmacognosia|microbiologia|bioquimica|fisiologia)\b/;
  var TOPIC_GENERIC = ' quais que materias materia disciplinas disciplina cadeira cadeiras onde estuda estudo aprende ensina fala trata sobre explica explique conceito definicao significa significado entre como funciona posso puxar tenho minha meus sobre ';
  function topicSearch(n) {
    var E = window.FarmaEmentas || {};
    var toks = String(n).split(' ').filter(function (t) { return t.length >= 5 && TOPIC_GENERIC.indexOf(' ' + t + ' ') < 0 && !STOP_SET[t]; });
    if (!toks.length || toks.length > 3) return { terms: '', list: [] };
    var out = [];
    (typeof disciplinas !== 'undefined' ? disciplinas : []).forEach(function (d) {
      var em = E[d.codigo];
      var nameN = norm(d.nome), hay = nameN + ' ' + norm(em ? em[0] + ' ' + em[1] : '');
      var sc = 0, ok = true;
      toks.forEach(function (t) {
        var stem = t.length >= 8 ? t.slice(0, t.length - 2) : t;
        if (nameN.indexOf(stem) >= 0) sc += 5; else if (hay.indexOf(stem) >= 0) sc += 1; else ok = false;
      });
      if (ok) out.push({ m: d, sc: sc });
    });
    out.sort(function (a, b) { return b.sc - a.sc; });
    return { terms: toks.join(' '), list: out.slice(0, 6).map(function (x) { return x.m; }) };
  }
  function clip(t, max) { t = String(t || ''); if (t.length <= max) return t; var c = t.slice(0, max); var i = Math.max(c.lastIndexOf('. '), c.lastIndexOf('; ')); return (i > max * 0.5 ? c.slice(0, i + 1) : c.replace(/\s+\S*$/, '')) + '…'; }

  function answerEmenta(m) {
    var E = (window.FarmaEmentas || {})[m.codigo];
    if (!E) return R(p('Não encontrei a ementa de ' + bold(m) + ' no PPC que eu consulto. O <strong>plano de ensino</strong> costuma ser pedido ao professor ou ao departamento.'), subjectChips(m));
    var html = p(bold(m) + ' · ' + codeTag(m)) + p('<strong>Ementa:</strong> ' + esc(clip(E[0], 700)));
    if (E[1]) html += p('<strong>Objetivo:</strong> ' + esc(clip(E[1], 320)));
    html += '<p class="farma-source">Fonte: ' + 'PPC de Farmácia, ementa da disciplina.</p>';
    return R(html, subjectChips(m));
  }
  function answerTopic(intent) {
    var list = intent.list || [];
    var head = p('Essa é uma dúvida de <strong>conteúdo de Farmácia</strong>: eu cuido da grade e das regras, então não explico o assunto em si.');
    if (!list.length) return R(head + p('Não achei “' + esc(intent.term) + '” nas ementas do PPC. Para dúvida de conteúdo, o melhor caminho é o professor da disciplina.'));
    return R(head + p('O que eu consigo mostrar é <strong>onde ele aparece</strong>, segundo as ementas do PPC:') + rowsHTML(list, 6) +
      '<p class="farma-source">Fonte: PPC de Farmácia, ementas das disciplinas.</p>', [{ label: 'Ver a ementa', q: 'Ementa de ' + list[0].codigo }]);
  }

  // ---------- hipóteses, comparação e conversa com contexto ----------
  function dependentsClosure(code) {
    var seen = {}, order = [], queue = [code];
    while (queue.length) {
      var c = queue.shift();
      getPrereqLockedSubjects(c).forEach(function (d) { if (!seen[d.codigo]) { seen[d.codigo] = d; order.push(d); queue.push(d.codigo); } });
    }
    return order;
  }
  function answerWhatIf(m, mode) {
    if (!m) return needSubject({ list: [], ambiguous: false }, 'E se eu reprovar em');
    var st = statusOf(m);
    if (mode === 'fail') {
      if (st === 'passed') return R(p('Você já marcou ' + bold(m) + ' como cursada, então esse cenário não se aplica.'), subjectChips(m));
      var direct = getPrereqLockedSubjects(m.codigo).filter(function (d) { return !appState.concludedCodes.has(d.codigo); });
      var all = dependentsClosure(m.codigo).filter(function (d) { return !appState.concludedCodes.has(d.codigo); });
      var cred = all.reduce(function (a, d) { return a + creditsOf(d); }, 0);
      var html = p('Se você <strong>não passar</strong> em ' + bold(m) + ', nada do que você já cursou se perde. O efeito é nas matérias que dependem dela, que ficam travadas até você refazer e passar.');
      if (!direct.length) html += p('A boa notícia: ela <strong>não é pré-requisito de nenhuma matéria</strong>, então não segura o resto da grade.');
      else {
        html += p('Ficam travadas diretamente ' + direct.length + ' ' + plural(direct.length, 'matéria', 'matérias') + ':') + rowsHTML(direct, 8);
        if (all.length > direct.length) html += p('Contando a cadeia inteira, são <strong>' + all.length + ' matérias</strong> (' + cred + ' créditos) que só podem andar depois dela.');
      }
      html += p('Dica: reprovar também pesa no CR, e o professor orientador pode ajudar a reorganizar o seu plano de estudos.');
      return R(html, [{ label: 'Como é calculado o CR?', q: 'Como é calculado o CR?' }, { label: 'Professor orientador', q: 'O que faz o professor orientador?' }].concat(subjectChips(m).slice(0, 1)));
    }
    if (st === 'passed') return R(p('Você já marcou ' + bold(m) + ' como cursada.') + dependentsHint(m), subjectChips(m));
    var before = {}; getPlannerAvailableSubjects().forEach(function (d) { before[d.codigo] = 1; });
    var plus = new Set(appState.concludedCodes); plus.add(m.codigo);
    var unlocked = disciplinas.filter(function (d) { return !plus.has(d.codigo) && !before[d.codigo] && checkReqs(d.pre, plus); });
    var html2 = p('Se você <strong>passar</strong> em ' + bold(m) + ', ');
    html2 = p('Se você <strong>passar</strong> em ' + bold(m) + ', ' + (unlocked.length ? 'passa a poder puxar ' + unlocked.length + ' ' + plural(unlocked.length, 'matéria nova', 'matérias novas') + ' (se não faltar mais nada):' : 'nenhuma matéria nova é liberada por ela sozinha.')) + (unlocked.length ? rowsHTML(unlocked, 8) : '');
    if (st === 'blocked') html2 += p('Só lembrando: hoje você ainda <strong>não pode puxar</strong> ' + bold(m) + ' (faltam pré-requisitos).');
    return R(html2, subjectChips(m));
  }
  function answerCompare(list) {
    var items = list.slice(0, 5);
    lastListed = items.slice();
    var rows = items.map(function (m) {
      var d = getPrereqLockedSubjects(m.codigo).length, c = dependentsClosure(m.codigo).length;
      return { m: m, d: d, c: c };
    });
    var maxD = Math.max.apply(null, rows.map(function (r) { return r.c; }));
    var maxC = Math.max.apply(null, rows.map(function (r) { return creditsOf(r.m); }));
    var html = p('Comparando ' + listNames(items.map(function (m) { return '<strong>' + esc(formatName(m)) + '</strong>'; })) + ':') +
      '<div class="farma-rows">' + rows.map(function (r) {
        return rowHTML(r.m, hoursOf(r.m) + ' h · destrava ' + r.d + (r.c > r.d ? ' (' + r.c + ' em cadeia)' : ''));
      }).join('') + '</div>';
    var best = rows.filter(function (r) { return r.c === maxD; });
    html += p(maxD > 0 ? '<strong>Destrava mais:</strong> ' + listNames(best.map(function (r) { return esc(formatName(r.m)); })) + '.' : 'Nenhuma delas destrava outras matérias.');
    html += p('<strong>Mais créditos:</strong> ' + listNames(rows.filter(function (r) { return creditsOf(r.m) === maxC; }).map(function (r) { return esc(formatName(r.m)); })) + ' (' + maxC + ').');
    html += '<p class="farma-note">Quem destrava mais costuma valer a pena primeiro; créditos altos pesam mais no CR.</p>';
    return R(html, [{ label: 'O que mais destrava?', q: 'O que mais destrava?' }, { label: 'Monte meu próximo período', q: 'Monte meu próximo período' }]);
  }
  function plainText(html) { return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
  function firstSentences(html, n) {
    var ps = String(html || '').match(/<p>[\s\S]*?<\/p>/g) || [];
    var out = [];
    for (var i = 0; i < ps.length && out.length < n; i += 1) { if (/farma-source|farma-note|<small>/.test(ps[i])) continue; out.push(plainText(ps[i])); }
    return out;
  }
  function answerReexplain(intent) {
    if (!ctx.res) return R(p('Ainda não respondi nada para eu explicar de novo. Me faça uma pergunta e, se não ficar claro, peça para eu simplificar ou dar um exemplo.'), exampleChips().slice(0, 3));
    var chips = (ctx.res.chips || []).slice(0, 3);
    if (ctx.rule) {
      var html = '';
      var lead = firstSentences(ctx.rule.html, 1)[0] || '';
      if (intent.detail) return R(p('Claro! Aqui está o texto completo de novo:') + ctx.rule.html, ctx.rule.chips);
      html += p('Em outras palavras: ' + esc(clip(lead, 320)));
      if (intent.example || !intent.simple) html += ctx.rule.example ? p('<strong>Exemplo:</strong> ' + esc(ctx.rule.example)) : p('Não tenho um exemplo pronto para essa regra. Se preferir, pergunte com o seu caso e eu mostro o que consta no manual.');
      html += p('Quer que eu detalhe? É só dizer “mais detalhes”.');
      return R(html, [{ label: 'Mais detalhes', q: 'Mais detalhes' }].concat(chips));
    }
    var m = ctx.subject;
    var sum = firstSentences(ctx.res.html, 2).join(' ');
    if (intent.example && m) {
      var deps = getPrereqLockedSubjects(m.codigo).slice(0, 2);
      return R(p('Um exemplo com ' + bold(m) + ': ao marcá-la como cursada, ' + (deps.length ? 'você passa a poder puxar ' + listNames(deps.map(function (d) { return '<strong>' + esc(formatName(d)) + '</strong>'; })) + ' (desde que os outros pré-requisitos estejam cumpridos).' : 'não muda a liberação de nenhuma outra matéria, porque ela não é pré-requisito de ninguém.')), subjectChips(m));
    }
    return R(p('Vou dizer de outro jeito: ' + esc(clip(sum, 360))) + p('Se ainda ficou confuso, me diga qual parte e eu detalho.'), chips);
  }
  function answerWhy() {
    if (!ctx.res) return R(p('Por que o quê? Me faça uma pergunta primeiro e depois eu explico o motivo.'), exampleChips().slice(0, 3));
    var m = ctx.subject;
    if (ctx.id === 'canTake' && m) return answerPrereqs(m);
    if (ctx.id === 'plan') return R(p('Montei a sugestão priorizando as <strong>obrigatórias dos períodos mais baixos</strong>, depois as que <strong>mais destravam outras matérias</strong>, respeitando pré e co-requisitos, o limite de créditos do SIGA e sem sobrepor a carga que você pediu.'), [{ label: 'Quais destravam mais?', q: 'O que mais destrava?' }]);
    if (ctx.id === 'priority') return R(p('Ordenei pelo <strong>número de matérias que cada uma destrava</strong>: quem libera mais caminho na grade aparece primeiro.'));
    return answerReexplain({ simple: true });
  }
  function answerPick(intent) {
    if (!intent.mat) return R(p('Não tenho uma lista aberta com essa posição. Me diga o nome ou o código da disciplina.'), exampleChips().slice(0, 3));
    lastSubject = intent.mat;
    return answerInfo(intent.mat);
  }
  function answerInvite(intent) {
    var tod = intent.greet ? (intent.part ? cap(intent.part[0]) : timeGreeting()) + (userName() ? ', ' + nameHTML() : '') + '! ' : '';
    return R(p(tod + 'Claro' + (!intent.greet && userName() ? ', ' + nameHTML() : '') + ', pode perguntar. Posso falar da sua grade (o que puxar, pré-requisitos, créditos) e das regras da Faculdade e da UFRJ.'), exampleChips());
  }
  function answerWorry(intent) {
    var html = p('Calma' + (userName() ? ', ' + nameHTML() : '') + ': dá para organizar isso por partes. Um caminho simples:') +
      ul(['<strong>Marque o que você já cursou</strong> no Planejador. Assim eu sei de onde você parte.', '<strong>Veja o que dá para puxar agora</strong> e o que mais destrava outras matérias.', '<strong>Fale com o seu professor orientador</strong>: ele ajuda a montar o plano de estudos e pode intervir se a coisa apertar.']);
    if (intent.formar) html += p('Sobre se formar a tempo: o prazo máximo é de <strong>1,5 vez</strong> a duração do curso, e eu posso mostrar quanto falta no seu progresso.');
    return R(html, [{ label: 'Quanto falta para formar?', q: 'Quanto falta para formar?' }, { label: 'O que posso puxar?', q: 'O que posso puxar?' }, { label: 'Prazo máximo', q: 'Qual o prazo máximo para me formar?' }, { label: 'Professor orientador', q: 'O que faz o professor orientador?' }]);
  }
  function answerFailed(intent) {
    var m = subjectFrom(intent.found);
    var html = p('Reprovar acontece, e ' + g('você não está sozinho', 'você não está sozinha', 'você não está sozinhe', 'você não está sozinho(a)') + '. Nada do que você já cursou se perde.');
    if (m) {
      var w = answerWhatIf(m, 'fail');
      return R(html + w.html, w.chips);
    }
    html += ul(['Refaça a disciplina na próxima oferta e salve a CRID.', 'Veja quais matérias dependem dela (me diga o nome e eu mostro).', 'Converse com o professor orientador sobre o plano de estudos; se o desempenho continuar baixo, a Resolução CEG 10/2004 prevê acompanhamento.']);
    return R(html, [{ label: 'Professor orientador', q: 'O que faz o professor orientador?' }, { label: 'Como é calculado o CR?', q: 'Como é calculado o CR?' }]);
  }
  function prereqClosure(m) {
    var seen = {}, order = [], queue = [m];
    while (queue.length) {
      var cur = queue.shift();
      extractCodes(cur.pre || '').forEach(function (c) {
        var d = getDisciplinaByCode(c);
        if (d && !seen[d.codigo]) { seen[d.codigo] = 1; order.push(d); queue.push(d); }
      });
    }
    return order;
  }
  function answerChain(m) {
    var all = prereqClosure(m);
    if (!all.length) return R(p(bold(m) + ' não tem pré-requisito, então não há cadeia: dá para puxar a qualquer momento.'), subjectChips(m));
    var pend = all.filter(function (d) { return !appState.concludedCodes.has(d.codigo); });
    var html = p('A cadeia completa de pré-requisitos de ' + bold(m) + ' tem <strong>' + all.length + ' ' + plural(all.length, 'matéria', 'matérias') + '</strong>' + (pend.length ? ', das quais <strong>' + pend.length + '</strong> você ainda não cursou:' : ', e você já cursou todas.')) + rowsHTML(pend.length ? pend : all, 12);
    html += '<p class="farma-note">Quando um pré-requisito tem alternativas (“ou”), listo todas as opções.</p>';
    return R(html, subjectChips(m));
  }
  function answerBothReq(m) { var a = answerPrereqs(m), b = answerCoreq(m); return R(a.html + b.html, subjectChips(m)); }

  function answerIntent(intent, raw) {
    var found = intent.found;
    var m = subjectFrom(found);
    if (m) lastSubject = m;
    switch (intent.id) {
      case 'empty': return null;
      case 'greet': return answerGreet(intent);
      case 'howare': return answerHowAre();
      case 'thanks': return answerThanks();
      case 'bye': return answerBye(intent);
      case 'ack': return answerAck(intent);
      case 'praise': return answerPraise();
      case 'frustrated': return answerFrustrated(raw);
      case 'who': return answerWho();
      case 'contacts': return R(p('Os contatos dos professores, chefes de departamento e da coordenação ficam em <strong>Configurações › Contatos importantes</strong>. Lá você pode pesquisar pelo nome ou pelo e-mail.'), [{ label: 'Abrir Contatos', go: 'modal-contatos' }]);
      case 'offscope': return R(p('Isso eu ainda não sei responder' + (userName() ? ', ' + nameHTML() : '') + '. Eu não tenho horários de aula, salas, notas nem o calendário acadêmico: consulte o SIGA ou a Secretaria. Posso ajudar com a sua grade e com as regras da UFRJ.'), exampleChips());
      case 'about': return answerAbout();
      case 'invite': return answerInvite(intent);
      case 'reexplain': return answerReexplain(intent);
      case 'why': return answerWhy();
      case 'more': return R(p('Quer ver o quê? Posso mostrar o que você pode puxar, o que mais destrava, montar um período ou explicar uma regra.'), exampleChips());
      case 'pick': return answerPick(intent);
      case 'worry': return answerWorry(intent);
      case 'failed': return answerFailed(intent);
      case 'whatif': return answerWhatIf(m, intent.mode);
      case 'compare': return answerCompare(intent.list);
      case 'ementa': return m ? answerEmenta(m) : (ctx.subject && !found.list.length && /\b(dela|dele|essa|esse|nela|nele)\b/.test(norm(raw)) ? answerEmenta(ctx.subject) : (found.list.length ? needSubject(found, 'Ementa de') : R(p('A <strong>ementa</strong> é o resumo do conteúdo de uma disciplina. Me diga o nome ou o código e eu mostro a que consta no PPC.'))));
      case 'topic': return answerTopic(intent);
      case 'chain': return m ? answerChain(m) : (ctx.subject && !found.list.length ? answerChain(ctx.subject) : needSubject(found, 'Cadeia de pré-requisitos de'));
      case 'bothReq': return m ? answerBothReq(m) : needSubject(found, 'Pré-requisitos de');
      case 'myname': return answerMyName();
      case 'setname': return answerSetName(raw);
      case 'setpron': return answerSetPron(raw);
      case 'setperiod': return answerSetPeriod(intent.value);
      case 'setshift': return answerSetShift(intent.value);
      case 'rule': return R((intent.rule.id === 'coordenacao' ? shiftHighlight(intent.rule.html) : '') + intent.rule.html + p('<small>' + esc('Regras podem mudar: confirme na Secretaria Acadêmica ou com o seu orientador.') + '</small>'), intent.rule.chips);
      case 'glossary': return answerGlossary(intent.term);
      case 'plan': return answerPlan(intent.target);
      case 'priority': return answerPriority();
      case 'free': return answerFree();
      case 'done': return answerDone();
      case 'progress': return answerProgress();
      case 'siga': return answerSiga();
      case 'nextPeriod': return answerNextPeriod();
      case 'pending': return answerPending();
      case 'available': return answerAvailable(raw);
      case 'period': return answerPeriod(intent.periodo);
      case 'periodPending': return answerPeriodPending(intent.periodo);
      case 'cond': return answerCond();
      case 'together': return answerTogether(intent.list);
      case 'fact': return m ? answerFact(m, intent.kind || 'period') : needSubject(found, 'Quantos créditos tem');
      case 'followup':
      case 'info': return m ? answerInfo(m) : needSubject(found, 'Sobre');
      case 'canTake': return m ? answerCanTake(m) : needSubject(found, 'Posso puxar');
      case 'locks': return m ? answerLocks(m, intent.onlyDependents) : (lastSubject && !found.list.length ? answerLocks(lastSubject, intent.onlyDependents) : needSubject(found, 'O que tranca'));
      case 'prereqs': return m ? answerPrereqs(m) : (lastSubject && !found.list.length ? answerPrereqs(lastSubject) : needSubject(found, 'Pré-requisitos de'));
      case 'coreq': return m ? answerCoreq(m) : (lastSubject && !found.list.length ? answerCoreq(lastSubject) : needSubject(found, 'Co-requisitos de'));
      default: return answerUnknown(intent.n || '');
    }
  }

  var NO_CTX = { reexplain: 1, why: 1, more: 1, invite: 1, thanks: 1, bye: 1, ack: 1, praise: 1, frustrated: 1, worry: 1, greet: 1, howare: 1, who: 1, about: 1, myname: 1, setname: 1, setpron: 1, setperiod: 1, setshift: 1, empty: 1, unknown: 1, contacts: 1, offscope: 1 };
  function answerText(text) {
    var picked = resolveChoice(text);
    var q = picked || text;
    var intent = classify(q);
    lastListed = null;
    var res = answerIntent(intent, q);
    if (!res) return null;
    if (!NO_CTX[intent.id]) {
      var cm = subjectFrom(intent.found);
      ctx.id = intent.id; ctx.subject = cm || lastSubject || ctx.subject;
      ctx.listed = lastListed && lastListed.length ? lastListed : (cm ? [cm] : []);
      ctx.res = res; ctx.rule = intent.rule || null;
    }
    if (LEAD_IDS[intent.id]) res.html = withLead(res.html);
    if (intent.id !== 'unknown' && intent.id !== 'empty') lastIntentId = intent.id;
    res.id = intent.id;
    return res;
  }

  function askNamePrompt() { return p('Aliás, <strong>como posso te chamar?</strong>'); }

  function handleAwaiting(text) {
    if (awaiting === 'name' || awaiting === 'newname') {
      var r = parseName(text);
      // Só vale como nome se for uma apresentação explícita ("me chamo Ana") ou algo que não parece pergunta nenhuma.
      if (r && r.name && !/\b(meu nome|me chamo|me chama|me chame|pode me chamar|eu sou|sou o|sou a)\b/.test(norm(text)) && classify(text).id !== 'unknown') r = null;
      if (r && r.skip) {
        setSkip(true); awaiting = null;
        return R(p('Tudo bem! Sigo sem o seu nome por enquanto. Se mudar de ideia, é só dizer “me chama de ...”.') + cardsHTML());
      }
      if (r && r.name) {
        if (UP()) UP().set({ name: r.name });
        setSkip(false);
        awaiting = awaiting === 'newname' ? null : 'pron'; pronTries = 0;
        if (awaiting === null) return R(p('Combinado! De agora em diante vou te chamar de <strong>' + esc(r.name) + '</strong>.'), exampleChips());
        return R(p('Prazer, <strong>' + esc(r.name) + '</strong>! Para eu falar com você do jeito certo: prefere que eu use <strong>ele</strong>, <strong>ela</strong> ou <strong>neutro</strong>?'),
          [{ label: 'Ele', q: 'Ele' }, { label: 'Ela', q: 'Ela' }, { label: 'Neutro', q: 'Neutro' }, { label: 'Pular', q: 'Pular' }]);
      }
      // não é um nome: se for uma pergunta, responde e lembra do nome depois
      var res = answerText(text);
      if (res && res.id !== 'unknown') { res.html += askNamePrompt(); return res; }
      return R(p('Hmm, não entendi isso como um nome. Pode me dizer só como quer ser chamado' + g('', 'a', '(a)', '(a)') + '? Por exemplo: “Maria”.'), [{ label: 'Prefiro não dizer', q: 'Prefiro não dizer' }]);
    }
    if (awaiting === 'pron') {
      var n = norm(text);
      var v = parsePronoun(n);
      if (/\b(pular|prefiro nao|nao quero|depois|nenhum)\b/.test(n)) {
        awaiting = null;
        return R(p('Sem problemas, ' + nameHTML() + '! Vou usar um tratamento neutro. Dá para mudar nas Configurações, em Usuário.') + cardsHTML());
      }
      if (v) {
        awaiting = null;
        if (UP()) UP().set({ pronoun: v });
        return R(p('Anotado, ' + nameHTML() + '! Vou me referir a você no <strong>' + PRON_LABEL[v] + '</strong>. ' + g('Seja bem-vindo', 'Seja bem-vinda', 'Seja bem-vinde', 'Seja bem-vindo(a)') + '!') + p('O que você quer saber primeiro?') + cardsHTML());
      }
      pronTries += 1;
      if (pronTries >= 2) { awaiting = null; return null; }
      return R(p('Não peguei essa. É só escolher: <strong>ele</strong>, <strong>ela</strong> ou <strong>neutro</strong>.'),
        [{ label: 'Ele', q: 'Ele' }, { label: 'Ela', q: 'Ela' }, { label: 'Neutro', q: 'Neutro' }, { label: 'Pular', q: 'Pular' }]);
    }
    return null;
  }

  function respond(raw) {
    var text = String(raw || '').trim();
    if (!text) return null;
    var res = null;
    if (awaiting) res = handleAwaiting(text);
    if (!res) res = answerText(text);
    return res;
  }

  // ---------- interface ----------
  var AVATAR = '<span class="farma-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 3.5h13v5.2a6.5 6.5 0 0 1-13 0z"></path><path d="M12 15.2V19M8.2 20.5h7.6"></path></svg></span>';
  var started = false;
  var busy = false;
  var reduceMotion = function () { return document.documentElement.classList.contains('no-anim') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
  function tr(x) { return typeof T === 'function' ? T(x) : x; }

  function messagesEl() { return $('farma-messages'); }
  function scrollDown() {
    var el = messagesEl();
    if (!el) return;
    el.scrollTo ? el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion() ? 'auto' : 'smooth' }) : (el.scrollTop = el.scrollHeight);
  }
  // Resposta longa: mostra o começo dela (não o fim); resposta curta: desce até o fim.
  function scrollToMessage(div) {
    var el = messagesEl();
    if (!el) return;
    var top = Math.max(0, div.offsetTop - 6);
    var tall = div.offsetHeight > el.clientHeight * 0.85;
    var target = tall ? top : el.scrollHeight;
    el.scrollTo ? el.scrollTo({ top: target, behavior: reduceMotion() ? 'auto' : 'smooth' }) : (el.scrollTop = target);
  }
  function addUser(text) {
    var el = messagesEl();
    var div = document.createElement('div');
    div.className = 'farma-msg is-user';
    div.innerHTML = '<div class="farma-bubble" data-no-i18n>' + esc(text) + '</div>';
    el.appendChild(div);
    scrollDown();
  }
  function addBot(html, extraClass) {
    var el = messagesEl();
    var div = document.createElement('div');
    div.className = 'farma-msg is-bot' + (extraClass ? ' ' + extraClass : '');
    var actions = extraClass === 'is-typing' ? '' : '<div class="farma-actions"><button type="button" class="farma-act" data-farma-copy aria-label="' + esc(tr('Copiar resposta')) + '" title="' + esc(tr('Copiar resposta')) + '">' + COPY_ICON + '</button></div>';
    div.innerHTML = AVATAR + '<div class="farma-body"><div class="farma-bubble" data-no-i18n>' + html + '</div>' + actions + '</div>';
    el.appendChild(div);
    if (extraClass === 'is-typing') { scrollDown(); return div; }
    scrollToMessage(div);
    return div;
  }
  function setChips(chips) {
    var box = $('farma-chips');
    if (!box) return;
    box.innerHTML = (chips || []).slice(0, 7).map(function (c) {
      return c.go
        ? '<button type="button" class="farma-chip" data-farma-go="' + esc(c.go) + '">' + esc(c.label) + '</button>'
        : '<button type="button" class="farma-chip" data-farma-ask="' + esc(c.q) + '" data-farma-label="' + esc(c.label) + '">' + esc(c.label) + '</button>';
    }).join('');
  }

  function ask(query, display) {
    var q = String(query || '').trim();
    if (!q || busy) return;
    busy = true;
    addUser(display || q);
    setChips([]);
    var typing = addBot('<span class="farma-typing" aria-label="FarmacIA está digitando"><i></i><i></i><i></i></span>', 'is-typing');
    var delay = reduceMotion() ? 0 : 380;
    window.setTimeout(function () {
      var res;
      try { res = respond(q); } catch (err) {
        console.warn('FarmacIA:', err);
        res = R(p('Tive um problema para responder essa. Tente reformular a pergunta, por favor.'));
      }
      var finish = function (r) {
        typing.remove();
        if (r) { addBot(r.html); setChips(r.chips); }
        setPlaceholder();
        busy = false;
      };
      // Camada v2 (js/farmacia/*): pode assumir perguntas de conteúdo (RAG + IA online) e devolve uma Promise.
      var orq = window.FarmaMod && window.FarmaMod.orquestrador, pending = null;
      try { pending = orq ? orq.interceptar(q, res) : null; } catch (err2) { console.warn('FarmacIA v2:', err2); pending = null; }
      if (pending && typeof pending.then === 'function') {
        pending.then(function (r2) { finish(r2 || res); }, function (err3) { console.warn('FarmacIA v2:', err3); finish(res); });
      } else finish(res);
    }, delay);
  }

  function setPlaceholder() {
    var input = $('farma-input');
    if (!input) return;
    var asking = awaiting === 'name' || awaiting === 'newname';
    input.placeholder = asking ? tr('Digite seu nome...') : tr('Pergunte qualquer coisa sobre a sua grade...');
    input.setAttribute('aria-label', input.placeholder);
  }
  function reset() {
    var el = messagesEl();
    if (!el) return;
    el.innerHTML = '';
    lastSubject = null; lastIntentId = null; choice = null; pronTries = 0; ctx = { id: null, subject: null, listed: [], res: null, rule: null };
    awaiting = needsName() ? 'name' : null;
    busy = false;
    if (window.FarmaMod && window.FarmaMod.orquestrador) window.FarmaMod.orquestrador.reset();
    addBot(welcomeHTML());
    setChips(needsName() ? [{ label: 'Prefiro não dizer', q: 'Prefiro não dizer' }] : []);
    setPlaceholder();
  }

  function show() {
    if (!started) { started = true; reset(); }
  }

  // Teclado do iPhone: a página usa a área visível, para o campo não ficar escondido.
  function bindViewport() {
    var vv = window.visualViewport;
    var page = $('modal-farmacia');
    if (!vv || !page) return;
    var adjust = function () {
      if (document.documentElement.classList.contains('farma-typing')) {
        page.style.setProperty('height', vv.height + 'px', 'important');
        page.style.setProperty('top', vv.offsetTop + 'px', 'important');
        page.style.setProperty('bottom', 'auto', 'important');
        scrollDown();
      } else {
        page.style.removeProperty('height');
        page.style.removeProperty('top');
        page.style.removeProperty('bottom');
      }
    };
    vv.addEventListener('resize', adjust);
    vv.addEventListener('scroll', adjust);
    window.__farmaAdjust = adjust;
  }

  function init() {
    var form = $('farma-form');
    var input = $('farma-input');
    var send = $('farma-send');
    if (!form || !input) return;
    var note = $('farma-lang-note');
    if (note && window.I18N && window.I18N.lang !== 'pt') note.hidden = false;

    input.addEventListener('input', function () { send.disabled = !input.value.trim(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) return;
      input.value = '';
      send.disabled = true;
      ask(v);
    });
    var root = document.documentElement;
    input.addEventListener('focus', function () { root.classList.add('farma-typing'); if (window.__farmaAdjust) window.__farmaAdjust(); });
    input.addEventListener('blur', function () {
      window.setTimeout(function () {
        if (document.activeElement !== input) { root.classList.remove('farma-typing'); if (window.__farmaAdjust) window.__farmaAdjust(); }
      }, 120);
    });
    $('farma-reset').addEventListener('click', function () { reset(); });
    $('modal-farmacia').querySelector('.farma-screen').addEventListener('click', function (e) {
      var go = e.target.closest('[data-farma-go]');
      if (go) { activateBottomTab(go.dataset.farmaGo); return; }
      var cp = e.target.closest('[data-farma-copy]');
      if (cp) {
        var bubble = cp.closest('.farma-body').querySelector('.farma-bubble');
        var txt = bubble ? bubble.innerText.trim() : '';
        var done = function () { if (typeof showToast === 'function') showToast({ text: tr('Resposta copiada.') }); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () {});
        return;
      }
      var btn = e.target.closest('[data-farma-ask]');
      if (btn) ask(btn.dataset.farmaAsk, btn.dataset.farmaLabel);
    });
    bindViewport();
    // Perfil alterado nas Configurações: se eu esperava o nome e ele já foi informado lá, sigo em frente.
    window.addEventListener('planejador:profile', function () {
      if ((awaiting === 'name' || awaiting === 'newname' || awaiting === 'pron') && userName()) { awaiting = null; setSkip(false); }
      setPlaceholder();
    });
    // Sai do modo "digitando" ao trocar de aba.
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#bottom-nav')) root.classList.remove('farma-typing');
    }, true);
  }

  // API pública (usada pela navegação e pelos testes).
  window.FarmacIA = { show: show, ask: ask, reset: reset, respond: respond, classify: classify, _norm: norm, _fuzzy: fuzzyNorm, _state: function () { return { awaiting: awaiting }; },
    // Ganchos para a camada v2 (js/farmacia/*): só leitura do que o assistente já sabe.
    _findSubjects: findSubjects, _ctx: function () { return ctx; }, _R: R, _p: p, _esc: esc, _chips: exampleChips,
    _perfil: function () { return { nome: userName(), periodo: userPeriod(), turno: userShift(), pronome: UP() ? UP().pronoun() : '' }; },
    _gen: g };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
