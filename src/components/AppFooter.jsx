import logo_pss from '/assets/logo_pss.png';

export default function AppFooter({ devInfo }) {
    return (
        <div className="mt-10 text-left px-6 border-2 border-gray-200 py-2 bg-gray-100 flex flex-row items-end justify-between">
            <a href="https://www.samorzad.zut.edu.pl/index.php?id=9298" target="_blank" rel="noopener noreferrer" className="h-auto w-1/4">
                <img src={logo_pss} alt="Logo PSS" />
            </a>
            <div>
                {devInfo?.link ? (
                    <p>
                        Utworzone przez{' '}
                        <a href={devInfo.link} className="font-bold tracking-tighter text-blue-600" target="_blank" rel="noreferrer">
                            {devInfo.author}
                        </a>
                    </p>
                ) : (
                    <p>
                        Utworzone przez <span className="font-bold tracking-tighter text-blue-600">PSS</span>
                    </p>
                )}
                <p>Wersja: {devInfo?.version ?? '-'}</p>
                <p>Ostatnia aktualizacja: {devInfo?.date ?? '-'}</p>
            </div>
        </div>
    );
}
