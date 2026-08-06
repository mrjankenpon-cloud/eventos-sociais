import { motion } from 'motion/react';

export default function About() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-gray-500 uppercase bg-gray-100 rounded-full">
            Nossa História
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-12 leading-[1.1]">
            Transformando paixão <br /> em <span className="text-gray-400">propósito social.</span>
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-lg text-gray-600 leading-relaxed">
            <p>
              O Eventos Sociais nasceu da convicção de que cada encontro é uma oportunidade de mudar uma realidade. Somos mais que uma plataforma de gestão; somos o elo entre causas nobres e pessoas dispostas a contribuir.
            </p>
            <p>
              Nossa missão é democratizar o acesso a eventos de impacto, oferecendo ferramentas profissionais para organizadores e experiências memoráveis para os participantes.
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              { label: 'Eventos Realizados', value: '500+' },
              { label: 'Vidas Impactadas', value: '50k+' },
              { label: 'Instituições Parceiras', value: '120+' },
            ].map((stat) => (
              <div key={stat.label} className="p-10 bg-gray-50 rounded-[40px]">
                <p className="text-4xl font-black mb-2">{stat.value}</p>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
